import React, { useEffect } from 'react';
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

import useBLE, { DataCharacteristicsType } from './src/req_perm';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';
import { Device } from 'react-native-ble-plx';

function App(): React.JSX.Element {
  const {isScanning, requestPermissions, stopScanning, scanForDevices, allDevices, connectToDevice, connectedDevice,connectedDeviceService,lastServiceCharacteristics, disconnectToDevice, dataCharacteristics, sendCommand} = useBLE();
  
  const reqPermissions = async () => {
    const result = await PermissionsAndroid.requestMultiple([ 
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN, 
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT, 
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, 
    ]); 
    const isAllPermissionsGranted = result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED && result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED && result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED; 
    console.log("[Permission]" , result);
    console.log("[Permission]" ,isAllPermissionsGranted);
  }

  const startScan = async () => {
    await reqPermissions();
    requestPermissions((isgranted : boolean) => {
      if(isgranted){
        scanForDevices()
      } else
      {
        Alert.alert(isgranted? 'Location Permission Granted' : 'Location Permission Denied')
      }
    })
  }

  useEffect(() => {
    startScan();
  }, [])
  return connectedDevice ? (
       <SafeAreaView style={{"flex": 1}}>
        <View style={{margin:10, padding:10, backgroundColor: 'rgba(193, 174, 203, 0.9)', borderRadius:10, display: "flex", flexDirection: "row", justifyContent: "space-between", alignContent: "space-between", flexWrap: "wrap"}}>
          <View>
            <Text style={{fontSize: 18, fontWeight: '600', color: "black", marginBottom: 10}}>Name: {connectedDevice?.name}</Text>
            <Text>MAC: {connectedDevice?.id}</Text>
            <Text>MTU: {connectedDevice?.mtu}</Text>
          </View>
          <TouchableOpacity onPress={() => disconnectToDevice(connectedDevice)} style={{"padding":10, width: 120, "marginVertical":10, "borderRadius":10, "backgroundColor": '#ffa07a'}}>
            <Text style={{margin: "auto", fontWeight: '600', color: "black"}}>Disconnected</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{"flex":1}}>
          {dataCharacteristics.length == 0 ? (<View style={{flex: 1, justifyContent: "center", alignContent: "center"}}>
        <ActivityIndicator size="large" />
        <Text style={{fontSize: 24, fontWeight: '400', color: "black", marginHorizontal: "auto"}}>Scanning for a HexCom Sensor</Text>
      </View>) 
      : 
      dataCharacteristics.map((item: DataCharacteristicsType, index: number) => (<View key={index} style={{margin:10, padding:10, backgroundColor: "white", borderRadius: 10}}>
            <Text style={{fontWeight: '300', color: "black"}}>MAC: {item.MAC}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Battery: {item.battery}%</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Temperature: {item.temperature}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Sensor code: {item.sensorCode}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Mode: {item.mode}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Find my device: {item.findMyDevice}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Number of sensor: {item.numberOfSensors}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Sensitive level: {item.sensitiveLevel}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Time since triggered: {item.timeSinceTriggered}</Text>
            <Text style={{fontWeight: '300', color: "black"}}>Triggered: {item.triggered}</Text>
            <TouchableOpacity onPress={() => {sendCommand(`{"cmd":"0x01","mac":"${item.MAC}"}`, index)}} style={{"padding":10, width: 120, "marginVertical":10, "borderRadius":10, "backgroundColor": '#ffa07a'}}>
              <Text style={{margin: "auto", fontWeight: '600', color: "black"}}>Reset device</Text>
            </TouchableOpacity>
          </View>))}
        </ScrollView>
      </SafeAreaView>) 
      : 
      allDevices.length === 0 ? (<View style={{flex: 1, justifyContent: "center", alignContent: "center"}}>
        <ActivityIndicator size="large" />
        <Text style={{fontSize: 24, fontWeight: '400', color: "black", marginHorizontal: "auto"}}>Scanning for a HexCom Gateway</Text>
      </View>) :
      (<SafeAreaView style={{"flex": 1}}>
        <ScrollView style={{"flex":1}}>
        {allDevices.map((device: Device, index: number) => (
          <View key={index} style={{margin:10, padding:10, backgroundColor: 'rgba(193, 174, 203, 0.9)', borderRadius:10, display: "flex", flexDirection: "row", justifyContent: "space-between", alignContent: "space-between", flexWrap: "wrap"}}>
            <View>
              <Text style={{fontSize: 18, fontWeight: '600', color: "black", marginBottom: 10}}>Name: {device.name}</Text>
              <Text>MAC: {device.id}</Text>
              <Text>RSSI: {device.rssi}</Text>
            </View>
            <TouchableOpacity onPress={() => {connectToDevice(device);}} style={{"padding":10, width: 100, "marginVertical":10, "borderRadius":10, "backgroundColor": '#6495ed'}}>
              <Text style={{margin: "auto", fontWeight: '600', color: "black"}}>Connect</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>)
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
    color: "black",
    borderRadius: 100,
  }
});

export default App;
