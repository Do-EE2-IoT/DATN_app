// Nhập các thư viện cần thiết
import React, {useEffect, useState} from 'react';
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
  TextInput,
  Button,
} from 'react-native';

import useBLE, {AllDeviceType, DataCharacteristicsType} from './src/req_perm';
import {PERMISSIONS, requestMultiple} from 'react-native-permissions';
import {Device} from 'react-native-ble-plx';

// Khai báo hàm App
function App(): React.JSX.Element {
  // Khai báo các biến trạng thái và hàm từ hook useBLE
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

  const [period, setPeriod] = useState(''); // Khai báo state period

  // Hàm yêu cầu quyền truy cập
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

  // Hàm bắt đầu quét thiết bị
  const startScan = async () => {
    await reqPermissions(); // Yêu cầu quyền truy cập
    requestPermissions((isgranted: boolean) => {
      if (isgranted) {
        scanForDevices(); // Bắt đầu quét thiết bị
      } else {
        Alert.alert(
          isgranted
            ? 'Location Permission Granted' // Thông báo nếu quyền truy cập được cấp
            : 'Location Permission Denied', // Thông báo nếu quyền truy cập bị từ chối
        );
      }
    });
  };

  // Sử dụng hook useEffect để bắt đầu quét khi component được mount
  useEffect(() => {
    startScan();
  }, []);

  // Trả về giao diện người dùng
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
          onPress={() => disconnectToDevice(connectedDevice)} // Hàm ngắt kết nối
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
        {dataCharacteristics.length == 0 ? ( // Kiểm tra nếu không có dữ liệu node
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
          dataCharacteristics
            .sort((a, b) => (a.fall === '1' ? -1 : 1)) // Sắp xếp dữ liệu
            .map((item: DataCharacteristicsType, index: number) => (
              <View
                key={index}
                style={{
                  margin: 10,
                  padding: 10,
                  backgroundColor: item.fall === '1' ? 'red' : 'white', // Đổi màu nếu có sự cố
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
                  Battery Percent: {item.battery_percent} 
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}>
                  <TextInput
                    style={{
                      height: 40,
                      borderColor: 'gray',
                      borderWidth: 1,
                      borderRadius: 5,
                      width: 80,
                      marginRight: 10,
                      paddingHorizontal: 5,
                      color: 'black',
                    }}
                    placeholder="Period" // Placeholder cho input
                    keyboardType="numeric" // Chỉ cho phép nhập số
                    onChangeText={text => setPeriod(text)} // Cập nhật period khi người dùng nhập
                  />
                  <Button
                    title="Change Period" // Nút thay đổi period
                    onPress={() =>
                      sendCommand(
                        `{"cmd":"0x06","mac":"${item.MAC}", "period":"${period}"}`, // Gửi lệnh thay đổi period
                        index,
                      )
                    }
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <View>
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x01","mac":"${item.MAC}"}`, // Gửi lệnh đo SpO2 và nhịp tim
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

                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x02","mac":"${item.MAC}"}`, // Gửi lệnh đo nhiệt độ
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
                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x04","mac":"${item.MAC}"}`, // Gửi lệnh tắt SpO2 và nhịp tim
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

                    <TouchableOpacity
                      onPress={() => {
                        sendCommand(
                          `{"cmd":"0x05","mac":"${item.MAC}"}`, // Gửi lệnh tắt nhiệt độ
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
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  ) : allDevices.length === 0 ? ( // Kiểm tra nếu không có thiết bị nào
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
                connectToDevice(device.dev); // Hàm kết nối đến thiết bị
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

// Định nghĩa các kiểu dáng cho các thành phần
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

// Xuất hàm App
export default App;