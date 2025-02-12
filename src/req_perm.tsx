// Nhập các thư viện cần thiết
import {useCallback, useEffect, useState} from 'react';
import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {
  BleError,
  BleManager,
  Characteristic,
  ConnectionOptions,
  Device,
  DeviceId,
  Service,
  Subscription,
  TransactionId,
  UUID,
} from 'react-native-ble-plx';

// Định nghĩa kiểu callback cho quyền truy cập
type PermissionCallback = (result: boolean) => void;

// Khởi tạo đối tượng BLEManager
const BLEManager = new BleManager();

// Định nghĩa interface cho API Bluetooth Low Energy
interface BluetoothLowEnergyApi {
  isScanning: boolean; // Cờ cho biết có đang quét hay không
  requestPermissions(callback: PermissionCallback): Promise<void>; // Yêu cầu quyền truy cập để quét thiết bị BLE
  scanForDevices(): void; // Bắt đầu quét thiết bị BLE
  stopScanning(): void; // Dừng quét thiết bị BLE
  allDevices: AllDeviceType[]; // Mảng chứa tất cả các thiết bị BLE đã phát hiện
  connectToDevice(device: Device): Promise<void>; // Kết nối đến một thiết bị BLE
  disconnectToDevice(device: Device): Promise<void>; // Ngắt kết nối từ một thiết bị BLE
  connectedDevice: Device | null; // Thiết bị BLE hiện đang kết nối
  connectedDeviceService: Service[]; // Mảng chứa các dịch vụ của thiết bị BLE hiện đang kết nối
  lastServiceCharacteristics: Characteristic[]; // Mảng chứa các đặc tính của dịch vụ cuối cùng
  dataCharacteristics: DataCharacteristicsType[]; // Dữ liệu cảm biến
  sendCommand(command: string, index: number): Promise<void>; // Gửi lệnh đến một thiết bị BLE đã kết nối
}

// Định nghĩa kiểu dữ liệu cho các đặc tính cảm biến
export interface DataCharacteristicsType {
  MAC: string; // Địa chỉ MAC của thiết bị
  spo2: string | null; // Mức SpO2
  heart_rate: string | null; // Nhịp tim
  temperature: string | null; // Nhiệt độ
  fall: string | null; // Tình trạng ngã
  battery_percent: string | null; // Phần trăm pin
  time: number | null; // Thời gian
}

// Định nghĩa kiểu dữ liệu cho tất cả các thiết bị
export interface AllDeviceType {
  dev: Device; // Thiết bị BLE
  time: number; // Thời gian phát hiện
}

// Hàm chính sử dụng hook để quản lý Bluetooth Low Energy
export default function useBLE(): BluetoothLowEnergyApi {
  const [isScanning, setIsScanning] = useState(false); // Trạng thái quét
  const [allDevices, setAllDevices] = useState<AllDeviceType[]>([]); // Danh sách tất cả các thiết bị
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null); // Thiết bị đang kết nối
  const [connectedDeviceService, setConnectedDeviceService] = useState<Service[]>([]); // Dịch vụ của thiết bị đang kết nối
  const [lastServiceCharacteristics, setLastServiceCharacteristics] = useState<Characteristic[]>([]); // Đặc tính của dịch vụ cuối cùng
  const [dataCharacteristics, setDataCharacteristics] = useState<DataCharacteristicsType[]>([]); // Dữ liệu cảm biến
  const [monitoringID, setMonitoringID] = useState<Subscription | null>(null); // ID theo dõi
  const [updateTime, setUpdateTime] = useState<number>(new Date().getTime()); // Thời gian cập nhật

  // Hàm yêu cầu quyền truy cập
  const requestPermissions = async (callback: PermissionCallback) => {
    if (Platform.OS === 'android') { // Kiểm tra nếu đang chạy trên Android
      const grantedStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // Yêu cầu quyền truy cập vị trí
        {
          title: 'Location Permission', // Tiêu đề thông báo
          message: 'Bluetooth Low Energy Needs Location Permission', // Thông báo yêu cầu quyền
          buttonNegative: 'Cancel', // Nút hủy
          buttonPositive: 'Ok', // Nút đồng ý
          buttonNeutral: 'Maybe Later', // Nút có thể sau
        },
      );
      callback(grantedStatus === PermissionsAndroid.RESULTS.GRANTED); // Gọi callback với kết quả
    } else {
      callback(true); // Nếu không phải Android, cho phép mặc định
    }
  };

  // Hàm kiểm tra thiết bị trùng lặp
  const isDuplicateDevice = (devices: AllDeviceType[], nextDevice: Device) =>
    devices.findIndex(device => nextDevice.id === device.dev.id) > -1;

  // Hàm bắt đầu quét thiết bị
  const scanForDevices = () => {
    console.log('[device scan started]'); // Log thông báo bắt đầu quét
    BLEManager.startDeviceScan(null, null, (error, device) => {
      if (error) { // Kiểm tra lỗi
        console.log('[device scan error]', JSON.stringify(error)); // Log lỗi quét
        stopScanning(); // Dừng quét
        Alert.alert(
          'ERROR', // Tiêu đề thông báo lỗi
          `Please turn on your location and Bluetooth close the app and try again.`, // Thông báo lỗi
          [
            {
              text: 'OK', // Nút OK
              onPress: () => {
                scanForDevices(); // Bắt đầu quét lại
              },
            },
          ],
        );
      } else {
        setIsScanning(true); // Đặt trạng thái quét là true
        if (device && device.name && device.name.includes('Proxy')) { // Kiểm tra nếu thiết bị hợp lệ
          setAllDevices(prevState => {
            if (isDuplicateDevice(prevState, device)) { // Nếu thiết bị đã tồn tại
              let updatedDevices = prevState; // Cập nhật danh sách thiết bị
              let scanned = {dev: device, time: new Date().getTime()}; // Thiết bị mới quét
              updatedDevices[prevState.findIndex(dev => device.id === dev.dev.id)] = scanned; // Cập nhật thiết bị
              return [...updatedDevices]; // Trả về danh sách thiết bị đã cập nhật
            }
            let scanned = {dev: device, time: new Date().getTime()}; // Thiết bị mới quét
            return [...prevState, scanned]; // Thêm thiết bị mới vào danh sách
          });
        }
      }
    });
  };

  // Hàm kết nối đến thiết bị
  const connectToDevice = async (device: Device) => {
    try {
      if (!device.name) { // Kiểm tra nếu thiết bị không có tên
        return; // Thoát hàm
      }
      const connectOptions: ConnectionOptions = {
        autoConnect: true, // Tự động kết nối
        requestMTU: 100, // Yêu cầu MTU
      };
      const deviceConnection = await device.connect(connectOptions); // Kết nối đến thiết bị
      if (!deviceConnection.name) { // Kiểm tra nếu thiết bị không có tên
        return; // Thoát hàm
      }
      setConnectedDevice(deviceConnection); // Cập nhật thiết bị đang kết nối
      stopScanning(); // Dừng quét
      await deviceConnection.discoverAllServicesAndCharacteristics(); // Khám phá tất cả dịch vụ và đặc tính
      BLEManager.stopDeviceScan(); // Dừng quét thiết bị
    } catch (e) {} // Bỏ qua lỗi
  };

  // Hàm dừng quét thiết bị
  const stopScanning = async () => {
    try {
      BLEManager.stopDeviceScan(); // Dừng quét thiết bị
      setIsScanning(false); // Đặt trạng thái quét là false
    } catch (error) {} // Bỏ qua lỗi
  };

  // Hàm ngắt kết nối thiết bị
  const disconnectToDevice = async (device: Device) => {
    try {
      if (device && connectedDevice) { // Kiểm tra nếu có thiết bị và thiết bị đang kết nối
        const deviceConnection = await BLEManager.isDeviceConnected(connectedDevice.id); // Kiểm tra kết nối
        if (deviceConnection) { // Nếu thiết bị đang kết nối
          if (monitoringID) { // Nếu có ID theo dõi
            monitoringID.remove(); // Xóa theo dõi
            setMonitoringID(null); // Đặt ID theo dõi là null
            setDataCharacteristics([]); // Xóa dữ liệu cảm biến
          }
          await BLEManager.cancelDeviceConnection(device.id); // Hủy kết nối thiết bị
          setConnectedDevice(null); // Đặt thiết bị đang kết nối là null
          scanForDevices(); // Bắt đầu quét thiết bị
        }
      }
    } catch (e) {} // Bỏ qua lỗi
  };

  // Hàm khám phá dịch vụ của thiết bị
  const discoverDeviceServices = useCallback(async () => {
    if (!connectedDevice) { // Kiểm tra nếu không có thiết bị kết nối
      throw new Error('No device connected'); // Ném lỗi
    }
    await connectedDevice.discoverAllServicesAndCharacteristics(); // Khám phá tất cả dịch vụ và đặc tính
  }, [connectedDevice]);

  // Hàm lấy dịch vụ của thiết bị
  const getDeviceServices = useCallback(async () => {
    try {
      if (!connectedDevice) { // Kiểm tra nếu không có thiết bị kết nối
        throw new Error('No device connected'); // Ném lỗi
      }
      await discoverDeviceServices(); // Khám phá dịch vụ
      const services = await connectedDevice.services(); // Lấy dịch vụ
      setConnectedDeviceService(services); // Cập nhật dịch vụ của thiết bị
    } catch (error) {
      throw new Error('No device connected'); // Ném lỗi
    }
  }, [connectedDevice, discoverDeviceServices]);

  // Hàm lấy đặc tính của dịch vụ cuối cùng
  const getLastDeviceServicesCharacteristics = useCallback(
    async (serviceUUID: string) => {
      try {
        if (!connectedDeviceService || !connectedDevice) { // Kiểm tra nếu không có dịch vụ hoặc thiết bị kết nối
          throw new Error('No device connected'); // Ném lỗi
        }
        await getDeviceServices(); // Lấy dịch vụ
        const characteristics = await connectedDevice.characteristicsForService(serviceUUID); // Lấy đặc tính
        setLastServiceCharacteristics(characteristics); // Cập nhật đặc tính của dịch vụ cuối cùng
      } catch (error) {
        throw new Error('No device connected'); // Ném lỗi
      }
    },
    [connectedDevice, discoverDeviceServices, getDeviceServices],
  );

  // Hàm theo dõi dữ liệu
  const monitoringData = useCallback(async () => {
    try {
      if (!connectedDevice || !connectedDeviceService) { // Kiểm tra nếu không có thiết bị hoặc dịch vụ kết nối
        throw new Error('No device connected'); // Ném lỗi
      }
      console.log('Monitoring data'); // Log thông báo theo dõi dữ liệu
      if (monitoringID) { // Nếu có ID theo dõi
        monitoringID.remove(); // Xóa theo dõi
        setMonitoringID(null); // Đặt ID theo dõi là null
      }
      setMonitoringID( // Đặt ID theo dõi mới
        connectedDevice.monitorCharacteristicForService(
          connectedDeviceService[connectedDeviceService.length - 1].uuid, // UUID dịch vụ
          lastServiceCharacteristics[0].uuid, // UUID đặc tính
          (error: BleError | null, characteristic: Characteristic | null) => {
            if (error) { // Kiểm tra lỗi
              console.log(`Error monitoring characteristic: ${error.message}`); // Log lỗi
              return; // Thoát hàm
            } else if (!characteristic || !characteristic.value) { // Kiểm tra nếu không có giá trị đặc tính
              console.log('Received empty characteristic value'); // Log thông báo không có giá trị
              return; // Thoát hàm
            }
            const rawData = characteristic.value; // Lấy giá trị thô
            const realData = atob(rawData).split('/'); // Giải mã giá trị
            console.log(`real data ${realData}`); // Log dữ liệu thực
            const data: DataCharacteristicsType = { // Tạo đối tượng dữ liệu cảm biến
              MAC: realData[0], // Địa chỉ MAC
              spo2: realData[1], // Mức SpO2
              heart_rate: realData[2], // Nhịp tim
              temperature: realData[3], // Nhiệt độ
              fall: realData[4], // Tình trạng ngã
              battery_percent: realData[5], // Phần trăm pin
              time: new Date().getTime(), // Thời gian
            };
            setUpdateTime(new Date().getTime()); // Cập nhật thời gian
            if (data.MAC) { // Kiểm tra nếu có địa chỉ MAC
              setDataCharacteristics(prevState => {
                const index = prevState.findIndex(item => {
                  return data.MAC === item.MAC; // Tìm chỉ số của dữ liệu
                });
                if (index < 0) { // Nếu không tìm thấy
                  return [...prevState, data]; // Thêm dữ liệu mới
                }
                prevState[index] = data; // Cập nhật dữ liệu cũ
                return [...prevState]; // Trả về danh sách dữ liệu đã cập nhật
              });
            }
          },
        ),
      );
    } catch (error) {
      throw new Error('No device connected'); // Ném lỗi
    }
  }, [
    connectedDevice,
    discoverDeviceServices,
    getDeviceServices,
    lastServiceCharacteristics,
  ]);

  // Hàm gửi lệnh đến thiết bị
  const sendCommand = async (command: string, index: number) => {
    try {
      if (
        monitoringID &&
        connectedDevice &&
        connectedDeviceService &&
        lastServiceCharacteristics // Kiểm tra nếu có ID theo dõi và thiết bị kết nối
      ) {
        const res = await BLEManager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          connectedDeviceService[connectedDeviceService.length - 1].uuid, // UUID dịch vụ
          lastServiceCharacteristics[0].uuid, // UUID đặc tính
          btoa(command), // Mã hóa lệnh
        );
        if (res) { // Nếu gửi lệnh thành công
          setTimeout(() => {
            let arrData = dataCharacteristics; // Lấy dữ liệu cảm biến
            arrData.splice(index, 1); // Xóa dữ liệu tại chỉ số index
            setDataCharacteristics(arrData); // Cập nhật dữ liệu cảm biến
          }, 1000); // Đợi 1 giây trước khi xóa
        }
      } else {
        throw new Error('No device connected or monitoring not started'); // Ném lỗi nếu không có thiết bị kết nối hoặc chưa bắt đầu theo dõi
      }
    } catch (error) {
      console.log('ERROR IN COMMAND', error); // Log lỗi khi gửi lệnh
    }
  };

  // Hook useEffect để lấy dịch vụ khi thiết bị kết nối
  useEffect(() => {
    console.log('Get service'); // Log thông báo lấy dịch vụ
    if (!connectedDevice || !discoverDeviceServices || !getDeviceServices) {
      return; // Thoát hàm nếu không có thiết bị hoặc dịch vụ
    }
    const getService = async () => {
      await getDeviceServices(); // Lấy dịch vụ
    };
    getService(); // Gọi hàm lấy dịch vụ
  }, [connectedDevice, discoverDeviceServices, getDeviceServices]);

  // Hook useEffect để lấy đặc tính của dịch vụ cuối cùng
  useEffect(() => {
    if (!connectedDevice || !connectedDeviceService.length) {
      return; // Thoát hàm nếu không có thiết bị hoặc dịch vụ
    }
    const getLastChars = async () => {
      await getLastDeviceServicesCharacteristics(
        connectedDeviceService[connectedDeviceService.length - 1].uuid, // UUID dịch vụ cuối cùng
      );
    };
    getLastChars(); // Gọi hàm lấy đặc tính
  }, [connectedDevice, connectedDeviceService.length]);

  // Hook useEffect để bắt đầu theo dõi dữ liệu
  useEffect(() => {
    if (
      !connectedDevice ||
      !connectedDeviceService ||
      !lastServiceCharacteristics // Kiểm tra nếu không có thiết bị, dịch vụ hoặc đặc tính
    ) {
      return; // Thoát hàm
    }
    const startMonitoring = async () => {
      await monitoringData(); // Bắt đầu theo dõi dữ liệu
    };
    startMonitoring(); // Gọi hàm bắt đầu theo dõi
  }, [connectedDevice, lastServiceCharacteristics]);

  // Hook useEffect để xử lý ngắt kết nối thiết bị
  useEffect(() => {
    if (!connectedDevice) {
      return; // Thoát hàm nếu không có thiết bị kết nối
    }
    BLEManager.onDeviceDisconnected(connectedDevice.id, () => {
      setConnectedDevice(null); // Đặt thiết bị kết nối là null
      setAllDevices([]); // Xóa danh sách thiết bị
      scanForDevices(); // Bắt đầu quét thiết bị
    });
  }, [connectedDevice]);

  // Hàm xóa dữ liệu cũ
  const removeOldData = (resData: DataCharacteristicsType[]) => {
    console.log('Clean up old data', resData); // Log thông báo xóa dữ liệu cũ
    if (resData.length) {
      console.log('Remove old data'); // Log thông báo xóa dữ liệu
      const filteredData = resData.filter(item => {
        if (item.time) {
          return new Date().getTime() - 60000 < item.time; // Giữ lại dữ liệu trong 1 phút
        }
        return false; // Nếu không có thời gian, xóa dữ liệu
      });
      return filteredData; // Trả về dữ liệu đã lọc
    }
    return resData; // Trả về dữ liệu gốc nếu không có dữ liệu
  };

  // Hàm xóa dữ liệu quét cũ
  const removeOldScan = (resData: AllDeviceType[]) => {
    if (resData.length) {
      const filteredData = resData.filter(item => {
        if (item.time) {
          return new Date().getTime() - 5000 < item.time; // Giữ lại dữ liệu trong 5 giây
        }
        return false; // Nếu không có thời gian, xóa dữ liệu
      });
      return filteredData; // Trả về dữ liệu đã lọc
    }
    return resData; // Trả về dữ liệu gốc nếu không có dữ liệu
  };

  // Hàm xóa thiết bị proxy cũ
  const removeProxy = (resData: number) => {
    if (resData < new Date().getTime() - 40000) { // Kiểm tra nếu thiết bị đã cũ hơn 40 giây
      if (connectedDevice) {
        disconnectToDevice(connectedDevice); // Ngắt kết nối thiết bị
      }
      return new Date().getTime(); // Trả về thời gian hiện tại
    }
    return resData; // Trả về dữ liệu gốc nếu không cần xóa
  };

  // Hook useEffect để cập nhật dữ liệu cũ
  useEffect(() => {
    setInterval(() => {
      setDataCharacteristics(prevState => removeOldData(prevState)); // Cập nhật dữ liệu cảm biến
      setAllDevices(prevState => removeOldScan(prevState)); // Cập nhật danh sách thiết bị
      setUpdateTime(prevState => removeProxy(prevState)); // Cập nhật thời gian
    }, 1000); // Cập nhật mỗi giây
  }, []);

  // Trả về các API cho Bluetooth Low Energy
  return {
    isScanning, // Trạng thái quét
    requestPermissions, // Hàm yêu cầu quyền truy cập
    scanForDevices, // Hàm bắt đầu quét
    stopScanning, // Hàm dừng quét
    allDevices, // Danh sách tất cả thiết bị
    connectToDevice, // Hàm kết nối đến thiết bị
    connectedDevice, // Thiết bị đang kết nối
    disconnectToDevice, // Hàm ngắt kết nối
    connectedDeviceService, // Dịch vụ của thiết bị đang kết nối
    lastServiceCharacteristics, // Đặc tính của dịch vụ cuối cùng
    dataCharacteristics, // Dữ liệu cảm biến
    sendCommand, // Hàm gửi lệnh
  };
}