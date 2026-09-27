package ph.ndtech.escposprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.UUID

/** Standard Serial Port Profile UUID used by Bluetooth ESC/POS printers. */
private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

/** Cheap printers drop data if it arrives faster than they can buffer it. */
private const val CHUNK_SIZE = 512

class EscposPrinterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "App context is not available", null)

  private val adapter: BluetoothAdapter?
    get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  override fun definition() = ModuleDefinition {
    Name("EscposPrinter")

    Function("isSupported") {
      adapter != null
    }

    Function("isEnabled") {
      adapter?.isEnabled == true
    }

    Function("hasConnectPermission") {
      hasConnectPermission()
    }

    AsyncFunction("getPairedDevicesAsync") {
      val bluetooth = requireReadyAdapter()
      @SuppressLint("MissingPermission") // checked in requireReadyAdapter()
      val devices = bluetooth.bondedDevices.orEmpty()
      devices
        .map { device -> describe(device) }
        .sortedWith(compareByDescending<Map<String, Any?>> { it["isPrinter"] as Boolean }.thenBy { it["name"] as String })
    }

    AsyncFunction("printAsync") Coroutine { address: String, base64Data: String ->
      val bytes = Base64.decode(base64Data, Base64.DEFAULT)
      withContext(Dispatchers.IO) { send(address, bytes) }
    }
  }

  private fun hasConnectPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
  }

  private fun requireReadyAdapter(): BluetoothAdapter {
    val bluetooth = adapter ?: throw CodedException("ERR_BT_UNSUPPORTED", "This phone does not support Bluetooth.", null)
    if (!hasConnectPermission()) {
      throw CodedException("ERR_BT_PERMISSION", "Allow Nearby devices (Bluetooth) permission to use the printer.", null)
    }
    if (!bluetooth.isEnabled) {
      throw CodedException("ERR_BT_DISABLED", "Bluetooth is turned off. Turn it on and try again.", null)
    }
    return bluetooth
  }

  @SuppressLint("MissingPermission")
  private fun describe(device: BluetoothDevice): Map<String, Any?> {
    val major = device.bluetoothClass?.majorDeviceClass
    return mapOf(
      "name" to (device.name ?: device.address),
      "address" to device.address,
      "isPrinter" to (major == BluetoothClass.Device.Major.IMAGING),
    )
  }

  @SuppressLint("MissingPermission")
  private suspend fun send(address: String, bytes: ByteArray) {
    val bluetooth = requireReadyAdapter()
    if (!BluetoothAdapter.checkBluetoothAddress(address)) {
      throw CodedException("ERR_BT_ADDRESS", "Invalid printer address: $address", null)
    }

    val device = bluetooth.getRemoteDevice(address)
    stopDiscoveryIfAllowed(bluetooth)

    val socket = try {
      connect(device)
    } catch (error: SecurityException) {
      throw CodedException(
        "ERR_BT_PERMISSION",
        "Android blocked the printer connection. Allow Nearby devices for NDTECH Collector in app settings.",
        error,
      )
    }
    try {
      val output = socket.outputStream
      var offset = 0
      while (offset < bytes.size) {
        val length = minOf(CHUNK_SIZE, bytes.size - offset)
        output.write(bytes, offset, length)
        output.flush()
        offset += length
        delay(20)
      }
      // Closing immediately can cut off the tail of the job on some printers.
      delay(minOf(1500L, 300L + bytes.size / 10))
    } catch (error: IOException) {
      throw CodedException("ERR_PRINT_FAILED", "Lost connection to the printer while printing. Try again.", error)
    } finally {
      runCatching { socket.close() }
    }
  }

  /**
   * An active device search slows down and destabilises RFCOMM connections,
   * so stop it when possible. On Android 12+ that needs BLUETOOTH_SCAN, which
   * this app doesn't request (it only uses already-paired printers), so it's
   * skipped there unless granted. Never let this block printing.
   */
  @SuppressLint("MissingPermission")
  private fun stopDiscoveryIfAllowed(bluetooth: BluetoothAdapter) {
    val canScan = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      context.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    if (!canScan) return
    runCatching {
      if (bluetooth.isDiscovering) bluetooth.cancelDiscovery()
    }
  }

  @SuppressLint("MissingPermission")
  private fun connect(device: BluetoothDevice): BluetoothSocket {
    val primary = device.createRfcommSocketToServiceRecord(SPP_UUID)
    try {
      primary.connect()
      return primary
    } catch (first: IOException) {
      runCatching { primary.close() }
    }

    // Many low-cost printers only accept the hidden channel-1 socket.
    try {
      val fallback = device.javaClass
        .getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
        .invoke(device, 1) as BluetoothSocket
      fallback.connect()
      return fallback
    } catch (error: Exception) {
      throw CodedException(
        "ERR_PRINTER_UNREACHABLE",
        "Can't connect to ${device.name ?: device.address}. Make sure the printer is on, charged, and nearby.",
        error,
      )
    }
  }
}
