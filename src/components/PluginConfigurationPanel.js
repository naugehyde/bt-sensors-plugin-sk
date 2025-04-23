import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import React from 'react'
import {useEffect, useState} from 'react'

import {Button, Grid} from '@material-ui/core';

import { SignalCellular0Bar, SignalCellular1Bar, SignalCellular2Bar, SignalCellular3Bar, SignalCellular4Bar, SignalCellularConnectedNoInternet0Bar    } from '@material-ui/icons';

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import { ListGroupItem } from 'react-bootstrap';

import ProgressBar from 'react-bootstrap/ProgressBar';


var _sensorMap

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

    return fetch(`/plugins/bt-sensors-plugin-sk/${path}`, {
      credentials: 'include'
    })

  }

  async function getSensorData(){
  
    const response = await fetchJSONData("sensors")
    if (response.status!=200){
      throw new Error(`Unable get sensor data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json

  }

  async function getBaseData(){
    
    const response = await fetchJSONData("base")
    if (response.status!=200){
      throw new Error(`Unable get base data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json
  }
  async function getProgress(){
    
    const response = await fetchJSONData("progress")
    if (response.status!=200){
      throw new Error(`Unable get progres: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    console.log(json)
    return json
  }

  function updateSensorData(data){
    sendJSONData("sendSensorData", data).then((response)=>{ 
      if (response.status != 200) {
        throw new Error(response.statusText)
      }
      sensorMap.get(data.mac_address)._changesMade=false
      sensorMap.get(data.mac_address).config = data
      
    })
  }

  function undoChanges(mac) {
    sensorMap.get(mac)._changesMade = false
    setSensorData( sensorMap.get(mac).config )
  }

  function removeSensorData(mac){
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
    sendJSONData("sendBaseData", data).then( (response )=>{
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

    getSensorData().then((sensors)=>{
      setSensorMap (new Map(sensors.map((sensor)=>[sensor.info.mac,sensor])));    
    })
    .catch((e)=>{
      setError(e)
    })
  }


  useEffect(()=>{

    fetchJSONData("sendPluginState").then( async (response)=> {
      const json = await response.json()
      setPluginState(json.state)
      console.log("Setting up eventsource")
      const eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse")
      
      eventSource.addEventListener("newsensor", (event) => {
        let json = JSON.parse(event.data)
        
        if (!_sensorMap.has(json.info.mac)) {
          console.log(`New sensor: ${json.info.mac}`)
          setSensorMap(new Map(_sensorMap.set(json.info.mac, json)))
        }
      });

      eventSource.addEventListener("sensorchanged", (event) => {
        let json = JSON.parse(event.data)        
        
        if (_sensorMap.has(json.mac)) {      
          let sensor = _sensorMap.get(json.mac)
          Object.assign(sensor.info, json )
          setSensorMap(new Map ( _sensorMap ))
        }
      });
      eventSource.addEventListener("progress", (event) => {
        const json = JSON.parse(event.data)  
        setProgress(json)
        console.log(json)
      });

      eventSource.addEventListener("pluginstate", (event) => {
        const json = JSON.parse(event.data)  
        setPluginState(json.state)
      });
      return () => eventSource.close();
    })

    .catch( (e) => { 
        setError(e)
      }
    )      
},[])

useEffect(()=>{
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

useEffect(()=>{
  console.log(error)
},[error])

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
useEffect(()=>{
    _sensorMap = sensorMap
    
    setSensorList(
      
      Array.from(sensorMap.entries()).map((entry) =>  {
        const sensor = sensorMap.get(entry[0]);
        const config= sensor.config
        const hasConfig = Object.keys(config).length>0;
        
       
       return <ListGroupItem action 
        onClick={()=>{ 
          if (sensor){
            config.mac_address=entry[0]
            setSchema(sensor.schema)
            setSensorData(config)
          }
        }
        }> 
        <div  class="d-flex justify-content-between align-items-center" style={hasConfig?{fontWeight:"normal"}:{fontStyle:"italic"}}>
        {`${sensor._changesMade?"*":""}${sensor.info.name} MAC: ${sensor.info.mac} RSSI: ${ifNullNaN(sensor.info.RSSI)}`  }
        <div class="d-flex justify-content-between ">
          {
            signalStrengthIcon(sensor)
          }
        </div>
        </div>
        </ListGroupItem>
    }) 
    )
   
  },[sensorMap]
  )

  function ifNullNaN(value){
    return value==null? NaN : value
  }

  
  if (pluginState=="stopped")
    return (<h1  >Enable plugin to see configuration</h1>)
  else
  return(
    <div>
      {error?<h2 style="color: red;">{error.message}</h2>:""}
      <Form 
        schema={baseSchema}
        validator={validator}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => {setSensorData(null); updateBaseData(formData) }}
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
      <h2>{`${sensorMap.size>0?"Bluetooth Devices click to configure" :""}`}</h2>
      <h2>{`${sensorMap.size>0?"(* means sensor has unsaved changes)" :""}`}</h2>
      <p></p>
      <div style={{paddingBottom: 20}} class="d-flex flex-wrap justify-content-start align-items-start">
      <ListGroup style={{  maxHeight: '300px', overflowY: 'auto' }}>
        {sensorList}
      </ListGroup>
      <div style= {{ paddingLeft: 10, paddingTop: 10, display: (Object.keys(schema).length==0)? "none" :""  }} >
      <Form
        schema={schema}
        validator={validator}
        uiSchema={uiSchema}
        onChange={(e) => {
            const s = sensorMap.get(e.formData.mac_address)
            s._changesMade=true
            //s.config = e.formData; 

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
    </div>
  )
    

  }