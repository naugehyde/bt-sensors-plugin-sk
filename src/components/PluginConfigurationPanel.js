import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import React from 'react'
import {useEffect, useState} from 'react'

import {Button, Grid} from '@material-ui/core';

import { SignalCellular0Bar, SignalCellular1Bar, SignalCellular2Bar, SignalCellular3Bar, SignalCellular4Bar, SignalCellularConnectedNoInternet0Bar    } from '@material-ui/icons';

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { ListGroupItem } from 'react-bootstrap';

import ProgressBar from 'react-bootstrap/ProgressBar';


var _sensorMap, _sensorDomains={}, _sensorList={}

export default (props) => {

  const hideSubmit= {
    'ui:submitButtonOptions': {
      props: {
        disabled: false,
        className: 'btn btn-info',
      },
      norender: true,
      submitText: 'Submit',
    },
  }
  const [baseSchema, setBaseSchema] = useState({})
  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  const [ uiSchema, setUISchema] = useState(hideSubmit )
  const [sensorList, setSensorList] = useState([])

  const [sensorData, setSensorData] = useState()
  const [sensorMap, setSensorMap ] = useState(new Map() )
 
  const [progress, setProgress ] = useState({
    "progress":0, "maxTimeout": 100, 
    "deviceCount":0, 
    "totalDevices":0})
  
 
  const [pluginState, setPluginState ] = useState("unknown")
  const [error, setError ] = useState()


  function sendJSONData(cmd, data){

    console.log(`sending ${cmd}`)
    console.log(data)
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    return fetch(`/plugins/bt-sensors-plugin-sk/${cmd}`, {
      credentials: 'include',
      method: 'POST',
	    body: JSON.stringify(data),
      headers:headers
    })
  }

  async function fetchJSONData(path){
    console.log(`fetching ${path}`)
    var result
    try {
      result = fetch(`/plugins/bt-sensors-plugin-sk/${path}`, {
        credentials: 'include'
      })
    } catch (e) {
      result=
        {
          status: 500,
          statusText: e.toString()
        }
    }
    return result
  }

  async function getSensors(){
    console.log("getSensors")
    const response = await fetchJSONData("getSensors")
    if (response.status!=200){
      throw new Error(`Unable get sensor data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json

  }
  async function getDomains(){
    console.log("getDomains")
    const response = await fetchJSONData("getDomains")
    if (response.status!=200){
      throw new Error(`Unable get domain data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json

  }
  async function getBaseData(){
    console.log("getBaseData")
    const response = await fetchJSONData("getBaseData")
    if (response.status!=200){
      throw new Error(`Unable get base data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json
  }
  async function getProgress(){
    console.log("getProgress")
    const response = await fetchJSONData("getProgress")
    if (response.status!=200){
      throw new Error(`Unable to get progress: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json
  }

  function updateSensorData(data){
    console.log("updateSensorData")
    sendJSONData("updateSensorData", data).then((response)=>{ 
      if (response.status != 200) {
        throw new Error(response.statusText)
      }
      sensorMap.get(data.mac_address)._changesMade=false
      sensorMap.get(data.mac_address).config = data
      
    })
  } 

  function undoChanges(mac) {
    console.log("undoChanges")
    sensorMap.get(mac)._changesMade = false
    setSensorData( sensorMap.get(mac).config )
  }

  function removeSensorData(mac){
    console.log("removeSensorData")

    try{ 
    
      sendJSONData("removeSensorData", {mac_address:mac} ).then((response)=>{
        if (response.status != 200) {
            throw new Error(response.statusText)
        }
        })

        _sensorMap.delete(mac)
        
        setSensorMap(new Map(_sensorMap))
        setSchema( {} )
    } catch {(e)=>
      setError( new Error(`Couldn't remove ${mac}: ${e}`))
    }
     
  }


  function updateBaseData(data){
    console.log("updateBaseData")

    sendJSONData("updateBaseData", data).then( (response )=>{
      if (response.status != 200) {
        setError(new Error(`Unable to update base data: ${response.statusText} (${response.status})`))
      } else {
        getProgress().then((json)=>{
          setProgress(json)
        }).catch((e)=>{
          setError(e)
        })
        refreshSensors()
      }
      })
  }
    

  function refreshSensors(){
    console.log('refreshing sensor map')

    getSensors().then((sensors)=>{
      setSensorMap (new Map(sensors.map((sensor)=>[sensor.info.mac,sensor])));    
    })
    .catch((e)=>{
      setError(e)
    })
  }


  useEffect(()=>{
    console.log("useEffect([])")
    let eventSource=null

    fetchJSONData("getPluginState").then( async (response)=> {
      if (response.status==404) {
        setPluginState("unknown")
        throw new Error("unable to get plugin state")
      }
      const json = await response.json()
      console.log("Setting up eventsource")
      eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse", { withCredentials: true })

      setPluginState(json.state)
      
      _sensorDomains = await getDomains()

      eventSource.addEventListener("newsensor", (event) => {
        console.log("newsensor")
        let json = JSON.parse(event.data)
        
        if (!_sensorMap.has(json.info.mac)) {
          console.log(`New sensor: ${json.info.mac}`)
          setSensorMap(new Map(_sensorMap.set(json.info.mac, json)))
        }
      });

      eventSource.addEventListener("sensorchanged", (event) => {
        let json = JSON.parse(event.data)      
        console.log("sensorchanged")
        console.log(json)
        
        if (_sensorMap.has(json.mac)) {      
          let sensor = _sensorMap.get(json.mac)
          Object.assign(sensor.info, json )
          setSensorMap(new Map ( _sensorMap ))
        }
      });
      eventSource.addEventListener("progress", (event) => {
        console.log("progress")
        const json = JSON.parse(event.data)  
        setProgress(json)
        console.log(json)
      });

      eventSource.addEventListener("pluginstate", (event) => {
        console.log("pluginstate")
        const json = JSON.parse(event.data)  
        setPluginState(json.state)
      });
     
    })

    .catch( (e) => { 
        setError(e)
      }
    )
    return () => { 
      console.log("Closing connection to SSE")
      eventSource.close()
    };
 },[])

useEffect(()=>{
  console.log("useEffect([pluginState])")
  if (pluginState=="started"){
    refreshSensors()
    
    getBaseData().then((json) => {
      setBaseSchema(json.schema);    
      setBaseData(json.data);
    }).catch((e)=>{
      setError(e)
    })

    getProgress().then((json)=>{
      setProgress(json)
    }).catch((e)=>{
      setError(e)
    })

  } else{
    setSensorMap(new Map())
    setBaseSchema({})
    setBaseData({})
  }

},[pluginState])



function confirmDelete(mac){
  const result = window.confirm(`Delete configuration for ${mac}?`)
  if (result)
    removeSensorData(mac)
}
 
function signalStrengthIcon(sensor){
  if (sensor.info.lastContactDelta ==null || sensor.info.lastContactDelta > sensor.config.discoveryTimeout) 
    return <SignalCellularConnectedNoInternet0Bar/>  
  
  if (sensor.info.signalStrength > 80)
    return <SignalCellular4Bar/> 

  if (sensor.info.signalStrength > 60)
    return <SignalCellular3Bar/> 

  if (sensor.info.signalStrength > 40)
    return <SignalCellular2Bar/>

  if (sensor.info.signalStrength > 20)
    return <SignalCellular1Bar/>

  return <SignalCellular0Bar/>

}
function hasConfig(sensor){
  return Object.keys(sensor.config).length>0;
}

function createListGroupItem(sensor){

  const config = hasConfig(sensor)
  return <ListGroupItem action 
        onClick={()=>{ 
            sensor.config.mac_address=sensor.info.mac
            setSchema(sensor.schema)
            setSensorData(sensor.config)
        }
        }> 
        <div  class="d-flex justify-content-between align-items-center" style={config?{fontWeight:"normal"}:{fontStyle:"italic"}}>
        {`${sensor._changesMade?"*":""}${sensor.info.name} MAC: ${sensor.info.mac} RSSI: ${ifNullNaN(sensor.info.RSSI)}`  }
        <div class="d-flex justify-content-between ">
          {
            signalStrengthIcon(sensor)
          }
        </div>
        </div>
        </ListGroupItem>
}

function configuredDevices(){
  return Array.from(sensorMap.entries()).filter((entry)=>hasConfig(entry[1]))
}

function devicesInDomain(domain){
  return Array.from(sensorMap.entries()).filter((entry)=>entry[1].info.domain===domain)
}


useEffect(()=>{
  console.log("useEffect([sensorMap])")

    _sensorMap = sensorMap
    
    const _sensorDomains = new Set(sensorMap.entries().map((entry)=>{ return entry[1].info.domain}))
    const sl = {
      _configured: configuredDevices().map((entry) =>  {
         return createListGroupItem(sensorMap.get(entry[0]))
      })
      } 

      _sensorDomains.forEach((d)=>{
        sl[d]=devicesInDomain(d).map((entry) =>  {
        return createListGroupItem(sensorMap.get(entry[0]))
       })
    })
    _sensorList=sl 
    
    
  },[sensorMap]
  )

  function ifNullNaN(value){
    return value==null? NaN : value
  }

  function getSensorList(domain){
    return _sensorList[domain]
  }

  function getTabs(){
    
    return Object.keys(_sensorList).map((domain)=> {return getTab(domain)})
  }
  function getTab(key){
    var title = key.slice(key.charAt(0)==="_"?1:0)
    
    return <Tab eventKey={key} title={title.charAt(0).toUpperCase()+title.slice(1)    }>
        
    <div style={{paddingBottom: 20}} class="d-flex flex-wrap justify-content-start align-items-start">
    <ListGroup style={{  maxHeight: '300px', overflowY: 'auto' }}>
      {getSensorList(key)}
    </ListGroup>

    <div style= {{ paddingLeft: 10, paddingTop: 10, display: (Object.keys(schema).length==0)? "none" :""  }} >

    <Form
      schema={schema}
      validator={validator}
      uiSchema={uiSchema}
      onChange={(e) => {
          const s = sensorMap.get(e.formData.mac_address)
          s._changesMade=true
          setSensorData(e.formData)
        }
      }
      onSubmit={({ formData }, e) => {
        console.log(formData) 
        updateSensorData(formData)
        setSchema({})
        alert("Changes saved")
      }}
      onError={log('errors')}
      formData={sensorData}>
      <div>
      <Grid direction="row" style={{spacing:5}}>
      <Button type='submit' color="primary" variant="contained">Save</Button>
      <Button variant="contained" onClick={()=>{undoChanges(sensorData.mac_address)}}>Undo</Button>
      <Button variant="contained" color="secondary" onClick={(e)=>confirmDelete(sensorData.mac_address)}>Delete</Button>

      </Grid>
      </div>
    </Form>

    </div>
    </div>
    </Tab>
  }

  if (pluginState=="stopped" || pluginState=="unknown")
    return (<h1  >Enable plugin to see configuration (if plugin is Enabled and you're seeing this message, restart SignalK)</h1>)
  else
  return(

    <div>
      {error?<h2 style="color: red;">{error}</h2>:""}
      <Form 
        schema={baseSchema}
        validator={validator}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => { updateBaseData(formData); setSchema({}) } }
        onError={log('errors')}
        formData={baseData}
      />
      <p></p>
      <p></p>
      { (progress.deviceCount<progress.totalDevices)?
        <ProgressBar max={progress.maxTimeout} 
                     now={progress.progress} 
        />:""
      }
      <h2>{`${sensorMap.size>0?"Bluetooth Devices - Select to configure" :""}`}</h2>
      <h2>{`${sensorMap.size>0?"(* = sensor has unsaved changes)" :""}`}</h2>
      <p></p>
      <Tabs
      defaultActiveKey="_configured"
      id="domain-tabs"
      className="mb-3"
      >
      {getTabs()}
      </Tabs>
    </div>
  )
    

  }