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

type PermissionCallback = (result: boolean) => void;

const BLEManager = new BleManager();

interface BluetoothLowEnergyApi {
  isScanning: boolean; // Flag indicating if scanning is in progress
  requestPermissions(callback: PermissionCallback): Promise<void>; // Request permission to scan BLE devices
  scanForDevices(): void; // Start scanning for BLE devices
  stopScanning(): void; // Stop scanning for BLE devices
  allDevices: AllDeviceType[]; // Array of all discovered BLE devices
  connectToDevice(device: Device): Promise<void>; // Connect to a BLE device
  disconnectToDevice(device: Device): Promise<void>; // Disconnect from a BLE device
  connectedDevice: Device | null; // Currently connected BLE device
  connectedDeviceService: Service[]; // Array of services of the currently connected BLE device
  lastServiceCharacteristics: Characteristic[]; // Array of characteristics of last service
  dataCharacteristics: DataCharacteristicsType[]; // Sensor data
  sendCommand(command: string, index: number): Promise<void>; // Send a command to a connected BLE device
}

export interface DataCharacteristicsType {
  MAC: string | null;
  spo2: string | null;
  heart_rate: string | null;
  temperature: string | null;
  fall: string | null;
  diastolic: string | null;
  systolic: string | null;
  battery_percent: string | null;
  time: number | null;
}

export interface AllDeviceType {
  dev: Device;
  time: number;
}

// learn useState, useEffect, useCallback, useMemo
export default function useBLE(): BluetoothLowEnergyApi {
  const [isScanning, setIsScanning] = useState(false);
  const [allDevices, setAllDevices] = useState<AllDeviceType[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [connectedDeviceService, setConnectedDeviceService] = useState<
    Service[]
  >([]);
  const [lastServiceCharacteristics, setLastServiceCharacteristics] = useState<
    Characteristic[]
  >([]);
  const [dataCharacteristics, setDataCharacteristics] = useState<
    DataCharacteristicsType[]
  >([]);
  const [monitoringID, setMonitoringID] = useState<Subscription | null>(null);
  const [updateTime, setUpdateTime] = useState<number>(new Date().getTime());

  const requestPermissions = async (callback: PermissionCallback) => {
    if (Platform.OS === 'android') {
      const grantedStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Bluetooth Low Energy Needs Location Permission',
          buttonNegative: 'Cancel',
          buttonPositive: 'Ok',
          buttonNeutral: 'Maybe Later',
        },
      );
      callback(grantedStatus === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      callback(true);
    }
  };

  const isDuplicateDevice = (devices: AllDeviceType[], nextDevice: Device) =>
    devices.findIndex(device => nextDevice.id === device.dev.id) > -1;
  const scanForDevices = () => {
    console.log('[device scan started]');
    BLEManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('[device scan error]', JSON.stringify(error));
        stopScanning();
        Alert.alert(
          'ERROR',
          `Please turn on your location and Bluetooth close the app and try again.`,
          [
            {
              text: 'OK',
              onPress: () => {
                scanForDevices();
              },
            },
          ],
        );
      } else {
        setIsScanning(true);
        if (device && device.name && device.name.includes('Proxy')) {
          setAllDevices(prevState => {
            if (isDuplicateDevice(prevState, device)) {
              let updatedDevices = prevState;
              let scanned = {dev: device, time: new Date().getTime()};
              updatedDevices[
                prevState.findIndex(dev => device.id === dev.dev.id)
              ] = scanned;
              return [...updatedDevices];
            }
            let scanned = {dev: device, time: new Date().getTime()};
            return [...prevState, scanned];
          });
        }
      }
    });
  };

  const connectToDevice = async (device: Device) => {
    try {
      if (!device.name) {
        return;
      }
      const connectOptions: ConnectionOptions = {
        autoConnect: true,
        requestMTU: 100,
      };
      const deviceConnection = await device.connect(connectOptions);
      if (!deviceConnection.name) {
        return;
      }
      setConnectedDevice(deviceConnection);
      stopScanning();
      await deviceConnection.discoverAllServicesAndCharacteristics();
      BLEManager.stopDeviceScan();
    } catch (e) {}
  };

  const stopScanning = async () => {
    try {
      BLEManager.stopDeviceScan();
      setIsScanning(false);
    } catch (error) {}
  };

  const disconnectToDevice = async (device: Device) => {
    try {
      if (device && connectedDevice) {
        const deviceConnection = await BLEManager.isDeviceConnected(
          connectedDevice.id,
        );
        if (deviceConnection) {
          if (monitoringID) {
            monitoringID.remove();
            setMonitoringID(null);
            setDataCharacteristics([]);
          }
          await BLEManager.cancelDeviceConnection(device.id);
          setConnectedDevice(null);
          scanForDevices();
        }
      }
    } catch (e) {}
  };

  const discoverDeviceServices = useCallback(async () => {
    if (!connectedDevice) {
      throw new Error('No device connected');
    }
    await connectedDevice.discoverAllServicesAndCharacteristics();
  }, [connectedDevice]);

  const getDeviceServices = useCallback(async () => {
    try {
      if (!connectedDevice) {
        throw new Error('No device connected');
      }
      await discoverDeviceServices(); // Make sure services are discovered before getting them.
      const services = await connectedDevice.services();
      setConnectedDeviceService(services);
    } catch (error) {
      throw new Error('No device connected');
    }
  }, [connectedDevice, discoverDeviceServices]);

  const getLastDeviceServicesCharacteristics = useCallback(
    async (serviceUUID: string) => {
      try {
        if (!connectedDeviceService || !connectedDevice) {
          throw new Error('No device connected');
        }
        await getDeviceServices();
        const characteristics = await connectedDevice.characteristicsForService(
          serviceUUID,
        );
        setLastServiceCharacteristics(characteristics);
      } catch (error) {
        throw new Error('No device connected');
      }
    },
    [connectedDevice, discoverDeviceServices, getDeviceServices],
  );

  const monitoringData = useCallback(async () => {
    try {
      if (!connectedDevice || !connectedDeviceService) {
        throw new Error('No device connected');
      }
      console.log('Monitoring data');
      if (monitoringID) {
        monitoringID.remove();
        setMonitoringID(null);
      }
      setMonitoringID(
        connectedDevice.monitorCharacteristicForService(
          connectedDeviceService[connectedDeviceService.length - 1].uuid,
          lastServiceCharacteristics[0].uuid,
          (error: BleError | null, characteristic: Characteristic | null) => {
            if (error) {
              console.log(`Error monitoring characteristic: ${error.message}`);
              return;
            } else if (!characteristic || !characteristic.value) {
              console.log('Received empty characteristic value');
              return;
            }
            const rawData = characteristic.value; // replace atob with your base64 decoding function if needed
            const realData = atob(rawData).split('/');
            console.log(`real data ${realData}`);
            const data: DataCharacteristicsType = {
              MAC: realData[0],
              spo2: realData[1],
              heart_rate: realData[2],
              temperature: realData[3],
              fall: realData[4],
              diastolic: realData[5],
              systolic: realData[6],
              battery_percent: realData[7],
              time: new Date().getTime(),
            };
            setUpdateTime(new Date().getTime());
            if (data.MAC) {
              setDataCharacteristics(prevState => {
                const index = prevState.findIndex(item => {
                  return data.MAC === item.MAC;
                });
                if (index < 0) {
                  return [...prevState, data];
                }
                prevState[index] = data;
                return [...prevState];
              });
            }
          },
        ),
      );
    } catch (error) {
      throw new Error('No device connected');
    }
  }, [
    connectedDevice,
    discoverDeviceServices,
    getDeviceServices,
    lastServiceCharacteristics,
  ]);

  const sendCommand = async (command: string, index: number) => {
    try {
      if (
        monitoringID &&
        connectedDevice &&
        connectedDeviceService &&
        lastServiceCharacteristics
      ) {
        const res = await BLEManager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          connectedDeviceService[connectedDeviceService.length - 1].uuid,
          lastServiceCharacteristics[0].uuid,
          btoa(command),
        );
        if (res) {
          setTimeout(() => {
            let arrData = dataCharacteristics;
            arrData.splice(index, 1);
            setDataCharacteristics(arrData);
          }, 1000);
        }
      } else {
        throw new Error('No device connected or monitoring not started');
      }
    } catch (error) {
      console.log('ERROR IN COMMAND', error);
    }
  };

  useEffect(() => {
    console.log('Get service');
    if (!connectedDevice || !discoverDeviceServices || !getDeviceServices) {
      return;
    }
    const getService = async () => {
      await getDeviceServices();
    };
    getService();
  }, [connectedDevice, discoverDeviceServices, getDeviceServices]);

  useEffect(() => {
    if (!connectedDevice || !connectedDeviceService.length) {
      return;
    }
    const getLastChars = async () => {
      await getLastDeviceServicesCharacteristics(
        connectedDeviceService[connectedDeviceService.length - 1].uuid,
      );
    };
    getLastChars();
  }, [connectedDevice, connectedDeviceService.length]);

  useEffect(() => {
    if (
      !connectedDevice ||
      !connectedDeviceService ||
      !lastServiceCharacteristics
    ) {
      return;
    }
    const startMonitoring = async () => {
      await monitoringData();
    };
    startMonitoring();
  }, [connectedDevice, lastServiceCharacteristics]);

  useEffect(() => {
    if (!connectedDevice) {
      return;
    }
    BLEManager.onDeviceDisconnected(connectedDevice.id, () => {
      setConnectedDevice(null);
      setAllDevices([]);
      scanForDevices();
    });
  }, [connectedDevice]);

  const removeOldData = (resData: DataCharacteristicsType[]) => {
    console.log('Clean up old data', resData);
    if (resData.length) {
      console.log('Remove old data');
      const filteredData = resData.filter(item => {
        if (item.time) {
          return new Date().getTime() - 60000 < item.time;
        }
        return false;
      });
      return filteredData;
    }
    return resData;
  };
  const removeOldScan = (resData: AllDeviceType[]) => {
    if (resData.length) {
      const filteredData = resData.filter(item => {
        if (item.time) {
          return new Date().getTime() - 5000 < item.time;
        }
        return false;
      });
      return filteredData;
    }
    return resData;
  };

  const removeProxy = (resData: number) => {
    if (resData < new Date().getTime() - 40000) {
      if (connectedDevice) {
        disconnectToDevice(connectedDevice);
      }
      return new Date().getTime();
    }
    return resData;
  };

  useEffect(() => {
    setInterval(() => {
      setDataCharacteristics(prevState => removeOldData(prevState));
      setAllDevices(prevState => removeOldScan(prevState));
      setUpdateTime(prevState => removeProxy(prevState));
    }, 1000);
  }, []);

  return {
    isScanning,
    requestPermissions,
    scanForDevices,
    stopScanning,
    allDevices,
    connectToDevice,
    connectedDevice,
    disconnectToDevice,
    connectedDeviceService,
    lastServiceCharacteristics,
    dataCharacteristics,
    sendCommand,
  };
}
