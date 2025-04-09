import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import React from 'react'
import {useEffect, useState} from 'react'
import Button from 'react-bootstrap/Button'

import Spinner from 'react-bootstrap/Spinner'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

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
  const showSubmit= {
    'ui:submitButtonOptions': {
      props: {
        disabled: false,
        className: 'btn btn-info',
      },
      norender: false,
      submitText: 'Submit',
    },
  }
  const [baseSchema, setBaseSchema] = useState({})
  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  const [ uiSchema, setUISchema] = useState(hideSubmit )
  const [sensorList, setSensorList] = useState([])

  const [sensorData, setSensorData] = useState({})
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
    })
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
        setSchema({})
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
      setSensorMap (new Map(sensors.map((sensor)=>[sensor.sensor.mac,sensor])));    
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
        
        if (!_sensorMap.has(json.sensor.mac)) {
          console.log(`New sensor: ${json.sensor.mac}`)
          setSensorMap(new Map(_sensorMap.set(json.sensor.mac, json)))
        }
      });

      eventSource.addEventListener("sensordisplayname", (event) => {
        let json = JSON.parse(event.data)        
        
        if (_sensorMap.has(json.mac)) {      
          let sensor = _sensorMap.get(json.mac)
          sensor.sensor.name=json.name
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

function confirmRemove(mac){
  const result = window.confirm(`Remove configuration for ${mac}?`)
  if (result)
    removeSensorData(mac)
}
 
useEffect(()=>{
    _sensorMap = sensorMap
    
    setSensorList(
      
      Array.from(sensorMap.entries()).map((entry) =>  {
        const config=sensorMap.get(entry[0]).config
        const hasConfig = Object.keys(config).length>0;
        var b="";
        if (hasConfig){
          b = <Button onClick={
            ()=>{        
              confirmRemove(entry[0])
            }
          }>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          }
       return <ListGroupItem action 
        onClick={()=>{ 
          if (sensorMap.get(entry[0])){
            config.mac_address=entry[0]
            setSchema(sensorMap.get(entry[0]).schema)
            setSensorData(config)
            setUISchema(showSubmit)
          }
        }
        }> 
        <div  class="d-flex justify-content-between align-items-center" style={hasConfig?{fontWeight:"normal"}:{fontStyle:"italic"}}>
        {entry[1].sensor.name}
        <div class="d-flex justify-content-between ">
          { b }
        </div>
        </div>
        </ListGroupItem>
    }) 
    )
   
  },[sensorMap]
  )

  function getProgressBar(){
    return <ProgressBar max={progress.maxTimeout} 
                         now={progress.progress} 
                         label={`${progress.deviceCount}% of ${progress.totalDevices}`} 
    />
  }

  function getSpinnerButton(){

    return <Button variant="primary" disabled>
    <Spinner
      as="span"
      animation="border"
      size="sm"
      role="status"
      aria-hidden="true"
    />
    Searching for sensors...
    </Button>
   
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
        onSubmit={ ({ formData }, e) => {setSchema({}); setUISchema(hideSubmit); updateBaseData(formData) }}
        onError={log('errors')}
        formData={baseData}
      />
      <p></p>
      <p></p>
      { (progress.deviceCount!=progress.totalDevices)?
        <ProgressBar max={progress.maxTimeout} 
                     now={progress.progress} 
        />:""
      }
      <h2>{`${sensorMap.size>0?" Bluetooth Devices click to configure":""}`}</h2>
      <p></p>
           
      <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {sensorList}
      </ListGroup>
      <p></p>
      <p></p>
      
      <Form
        schema={schema}
        validator={validator}
        uiSchema={uiSchema}
        onChange={(e) => setSensorData(e.formData)}
        onSubmit={({ formData }, e) => {
          console.log(formData) 
          updateSensorData(formData)}}
        onError={log('errors')}
        formData={sensorData}
      />  
    </div>
  )
    

  }