import React, {useEffect} from 'react';
import type {PropsWithChildren} from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  PermissionsAndroid,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import useBLE, {AllDeviceType, DataCharacteristicsType} from './src/req_perm';
import {PERMISSIONS, requestMultiple} from 'react-native-permissions';
import {Device} from 'react-native-ble-plx';

function App(): React.JSX.Element {
  const {
    isScanning,
    requestPermissions,
    stopScanning,
    scanForDevices,
    allDevices,
    connectToDevice,
    connectedDevice,
    connectedDeviceService,
    lastServiceCharacteristics,
    disconnectToDevice,
    dataCharacteristics,
    sendCommand,
  } = useBLE();

  const reqPermissions = async () => {
    const result = await PermissionsAndroid.requestMultiple([
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ]);
    const isAllPermissionsGranted =
      result['android.permission.BLUETOOTH_SCAN'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.ACCESS_FINE_LOCATION'] ===
        PermissionsAndroid.RESULTS.GRANTED;
    console.log('[Permission]', result);
    console.log('[Permission]', isAllPermissionsGranted);
  };

  const startScan = async () => {
    await reqPermissions();
    requestPermissions((isgranted: boolean) => {
      if (isgranted) {
        scanForDevices();
      } else {
        Alert.alert(
          isgranted
            ? 'Location Permission Granted'
            : 'Location Permission Denied',
        );
      }
    });
  };

  useEffect(() => {
    startScan();
  }, []);
  return connectedDevice ? (
    <SafeAreaView style={{flex: 1}}>
      <View
        style={{
          margin: 10,
          padding: 10,
          backgroundColor: 'rgba(193, 174, 203, 0.9)',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignContent: 'space-between',
          flexWrap: 'wrap',
        }}>
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: 'black',
              marginBottom: 10,
            }}>
            Name: {connectedDevice?.name}
          </Text>
          <Text>MAC: {connectedDevice?.id}</Text>
          <Text>Number of node: {dataCharacteristics.length}</Text>
        </View>
        <TouchableOpacity
          onPress={() => disconnectToDevice(connectedDevice)}
          style={{
            padding: 10,
            width: 120,
            marginVertical: 10,
            borderRadius: 10,
            backgroundColor: '#ffa07a',
          }}>
          <Text style={{margin: 'auto', fontWeight: '600', color: 'black'}}>
            Disconnect
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{flex: 1}}>
        {dataCharacteristics.length == 0 ? (
          <View
            style={{flex: 1, justifyContent: 'center', alignContent: 'center'}}>
            <ActivityIndicator size="large" />
            <Text
              style={{
                fontSize: 24,
                fontWeight: '400',
                color: 'black',
                marginHorizontal: 'auto',
              }}>
              Scanning for node
            </Text>
          </View>
        ) : (
          dataCharacteristics.map(
            (item: DataCharacteristicsType, index: number) => (
              <View
                key={index}
                style={{
                  margin: 10,
                  padding: 10,
                  backgroundColor: 'white',
                  borderRadius: 10,
                }}>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  MAC: {item.MAC}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  SpO2: {item.spo2}%
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Heart Rate: {item.heart_rate}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Temperature : {item.temperature}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Fall: {item.fall}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Systolic : {item.systolic}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Diastolic: {item.diastolic}
                </Text>
                <Text style={{fontWeight: '900', color: 'black'}}>
                  Battery Percent: {item.battery_percent}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <View>
                    {/* Measure BP */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x03","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#ffa07a',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Measure BP
                      </Text>
                    </TouchableOpacity>

                    {/* Measure SpO2 and HR */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x01","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#ffa07a',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Measure SpO2 and HR
                      </Text>
                    </TouchableOpacity>

                    {/* Measure Temperature */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x02","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#ffa07a',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Measure Temperature
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    {/* Turn Off BP */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x05","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#87CEEB',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Turn Off BP
                      </Text>
                    </TouchableOpacity>

                    {/* Turn Off SpO2 and HR */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x04","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#87CEEB',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Turn Off SpO2 and HR
                      </Text>
                    </TouchableOpacity>

                    {/* Turn Off Temperature */}
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x05","mac":"${item.MAC}"}`,
                          index,
                        );
                      }}
                      style={{
                        padding: 10,
                        width: 170,
                        marginVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#87CEEB',
                      }}>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '600',
                          color: 'black',
                        }}>
                        Turn Off Temperature
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ),
          )
        )}
      </ScrollView>
    </SafeAreaView>
  ) : allDevices.length === 0 ? (
    <View style={{flex: 1, justifyContent: 'center', alignContent: 'center'}}>
      <ActivityIndicator size="large" />
      <Text
        style={{
          fontSize: 24,
          fontWeight: '400',
          color: 'black',
          marginHorizontal: 'auto',
        }}>
        Scanning for a Proxy
      </Text>
    </View>
  ) : (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={{flex: 1}}>
        {allDevices.map((device: AllDeviceType, index: number) => (
          <View
            key={index}
            style={{
              margin: 10,
              padding: 10,
              backgroundColor: 'rgba(193, 174, 203, 0.9)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignContent: 'space-between',
              flexWrap: 'wrap',
            }}>
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'black',
                  marginBottom: 10,
                }}>
                Name: {device.dev.name}
              </Text>
              <Text>MAC: {device.dev.id}</Text>
              <Text>RSSI: {device.dev.rssi}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                connectToDevice(device.dev);
              }}
              style={{
                padding: 10,
                width: 100,
                marginVertical: 10,
                borderRadius: 10,
                backgroundColor: '#6495ed',
              }}>
              <Text style={{margin: 'auto', fontWeight: '600', color: 'black'}}>
                Connect
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    position: 'absolute',
    bottom: 30,
    right: 20,
    height: 70,
    backgroundColor: 'white',
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
    borderRadius: 100,
  },
});

export default App;
