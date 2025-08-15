import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import ReactHtmlParser from 'react-html-parser';
import React from 'react'
import {useEffect, useState} from 'react'

import {Button, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { SignalCellular0Bar, SignalCellular1Bar, SignalCellular2Bar, SignalCellular3Bar, SignalCellular4Bar, SignalCellularConnectedNoInternet0Bar    } from '@material-ui/icons';

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { ListGroupItem } from 'react-bootstrap';

import ProgressBar from 'react-bootstrap/ProgressBar';

export function BTConfig (props)  {

   const _uiSchema= {
    "ui:options": {label: false},
    "paths":{
      enableMarkdownInDescription:true
    },
    'title': { 'ui:widget': 'hidden' },
  }

  const baseUISchema = 
  {
  "ui:field": "LayoutGridField",
  "ui:layoutGrid": {
      "ui:row":[
      {
        "ui:row": {
          "className": "row",
          "children": [
            {
              "ui:columns": {
                "className": "col-xs-4",
                "children": [
                  "adapter",
                  "transport",
                  "duplicateData",
                  "discoveryTimeout",
                  "discoveryInterval"
                ]
              }
            }
          ]
        }
      }
      ]
    }
  }

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

  const [baseSchema, setBaseSchema] = useState({})

  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  const [ uiSchema, setUISchema] = useState(_uiSchema )

  const [sensorData, setSensorData] = useState()
  const [sensorMap, setSensorMap ] = useState(new Map())
 
  const [progress, setProgress ] = useState({
    "progress":0, "maxTimeout": 100, 
    "deviceCount":0, 
    "totalDevices":0})
  
 
  const [pluginState, setPluginState ] = useState("unknown")
  const [error, setError ] = useState()
  const classes = useStyles();

 
  function sendJSONData(cmd, data){

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    return fetch(`/plugins/bt-sensors-plugin-sk/${cmd}`, {
      credentials: 'include',
      method: 'POST',
	    body: JSON.stringify(data),
      headers:headers
    })
  }
async function fetchJSONData(path, data = {}) {
  let result;
  try {
    // Convert data object to query string
    const query = Object.keys(data).length
      ? '?' + new URLSearchParams(data).toString()
      : '';
    result = await fetch(`/plugins/bt-sensors-plugin-sk/${path}${query}`, {
      credentials: 'include',
      method: 'GET'
    });
  } catch (e) {
    result = {
      status: 500,
      statusText: e.toString()
    };
  }
  return result;
}
  async function getSensors(){
    const response = await fetchJSONData("getSensors")
    if (response.status!=200){
      throw new Error(`Unable get sensor data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()

    return json

  }


  async function getSensorInfo(mac, sensorClass){
    const response = await fetchJSONData("getSensorInfo",{mac_address: mac, class: sensorClass})
    if (response.status!=200){
      debugger
      throw new Error(`Unable get sensor info: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    return json
  }

  async function getBaseData(){
    const response = await fetchJSONData("getBaseData")
    if (response.status!=200){
      throw new Error(`Unable to get base data: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    json.schema.htmlDescription=<div>{ReactHtmlParser(json.schema.htmlDescription)}<p></p></div>
    return json
  }

  async function getProgress(){
    const response = await fetchJSONData("getProgress")
    if (response.status!=200){
      throw new Error(`Unable to get progress: ${response.statusText} (${response.status}) `)
    }
    const json = await response.json()
    return json
  }

  function updateSensorData(data){
    sendJSONData("updateSensorData", data).then((response)=>{ 
      if (response.status != 200) {
        throw new Error(response.statusText)
      }
      setSensorMap((sm)=>{sm.delete(data.mac_address); return new Map(sm) })
      setSchema( {} )

    })
  } 

  function undoChanges(mac) {
    sensorMap.get(mac)._changesMade = false
    sensorMap.get(mac).config = JSON.parse(JSON.stringify(sensorMap.get(mac).configCopy))
    setSensorData( sensorMap.get(mac).config )
  }

  function removeSensorData(mac){

    try{ 
    
      sendJSONData("removeSensorData", {mac_address:mac} ).then((response)=>{
        if (response.status != 200) {
            throw new Error(response.statusText)
        }
        })
        setSensorMap((sm)=>{sm.delete(mac); return new Map(sm) })
        setSchema( {} )
    } catch {(e)=>
      setError( `Couldn't remove ${mac}: ${e}`)
    }
     
  }


  function updateBaseData(data){
    setSensorMap(new Map())
    //setSensorList({})
    sendJSONData("updateBaseData", data).then( (response )=>{
      if (response.status != 200) {
        setError(`Unable to update base data: ${response.statusText} (${response.status})`)
      } 
      })

  }
  
  


  useEffect(()=>{
    let eventSource=null
    fetchJSONData("getPluginState").then( async (response)=> {
    
      function newSensorEvent(event){
        let json = JSON.parse(event.data)
        console.log(`New sensor: ${json.info.mac}`)
        setSensorMap( (_sm)=> {
          //if (!_sm.has(json.info.mac))
          _sm.set(json.info.mac, json)
        
          return new Map(_sm)
        }
        )
      }
      function sensorChangedEvent(event){
        console.log("sensorchanged")
        const json = JSON.parse(event.data)      
        
        setSensorMap( (_sm) => {
          const sensor = _sm.get(json.mac)
          if (sensor) 
            Object.assign(sensor.info, json )
          return new Map(_sm)
        })
      }
      

      if (response.status==404) {
        setPluginState("unknown")
        throw new Error("unable to get plugin state")
      }
      const json = await response.json()
      eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse", { withCredentials: true })

      eventSource.addEventListener("newsensor", (event) => {
        newSensorEvent(event)
      });

      eventSource.addEventListener("sensorchanged", (event) => {
        sensorChangedEvent(event)
      });

      eventSource.addEventListener("progress", (event) => {
        const json = JSON.parse(event.data)  
        setProgress(json)
      });

      eventSource.addEventListener("pluginstate", (event) => {
        const json = JSON.parse(event.data)  
        setPluginState(json.state)
      });
      
    setPluginState(json.state);

    (async ()=>{
      const sensors = await getSensors()
      setSensorMap ( new Map(sensors.map((sensor)=>[sensor.info.mac,sensor])) )
    })()

    })
    .catch( (e) => { 
        setError(e.message)
      }
    )
    return () => { 
      console.log("Closing connection to SSE")
      eventSource.close()
    };
    
 },[])


 useEffect(()=>{
  
  if (!(sensorData && sensorMap) )  return
  
  const _sensor = sensorMap.get(sensorData.mac_address)
  if (_sensor && schema && sensorData  &&
    Object.hasOwn(sensorData,"params" )){
    
      if (_sensor.info.class == "UNKNOWN" && sensorData.params.sensorClass && sensorData.params.sensorClass != "UNKNOWN") {
        debugger
      getSensorInfo(sensorData.mac_address, sensorData.params.sensorClass).then((json)=>{
        setSchema(json.schema)
      }).catch((e)=>{
        setError(e.message)
      })
    }
  
  }
  
 },[sensorData])


useEffect(()=>{
  if (pluginState=="started") {
    getBaseData().then((json) => {
      setBaseSchema(json.schema);    
      setBaseData(json.data);
    }).catch((e)=>{
      setError(e.message)
    })

    getProgress().then((json)=>{
      setProgress(json)
    }).catch((e)=>{
      setError(e.message)
    })

  } else{
    setBaseSchema({})
    setBaseData({})
  }

},[pluginState])


function confirmDelete(mac){
  
  const sensor = sensorMap.get(mac)
  const result = !hasConfig(sensor) || window.confirm(`Delete configuration for ${sensor.info.name}?`)
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
  return Object.keys(sensor.configCopy).length>0;
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


function devicesInDomain(domain){

  return Array.from(sensorMap.entries()).filter((entry)=>entry[1].info.domain===domain)
}

  function ifNullNaN(value){
    return value==null? NaN : value
  }

  function getTabs(){
    const sensorDomains = [... (new Set(sensorMap.entries().map((entry)=>{ return entry[1].info.domain})))].sort()
    const cd = Array.from(sensorMap.entries()).filter((entry)=>hasConfig(entry[1]))
    let sensorList={}
    sensorList["_configured"]=
      cd.length==0?
        "Select a device from its domain tab (Electrical etc.) and configure it.":
        cd.map((entry) =>  {
         return createListGroupItem(sensorMap.get(entry[0]))
      })
      
      sensorDomains.forEach((d)=>{
        sensorList[d]=devicesInDomain(d).map((entry) =>  {
        return createListGroupItem(sensorMap.get(entry[0]))
       })
      })
    
    return Object.keys(sensorList).map((domain)=> {return getTab(domain, sensorList[domain])})
  }

  function getTab(key, sensorList){
    let  title = key.slice(key.charAt(0)==="_"?1:0)
    
    return <Tab eventKey={key} title={`${title.charAt(0).toUpperCase()}${title.slice(1)}${typeof sensorList=='string'?'':' ('+sensorList.length+')'}` }  >
        
    <ListGroup style={{  maxHeight: '300px', overflowY: 'auto' }}>
      {sensorList}
    </ListGroup>
    

    </Tab>
  }

 
  function openInNewTab (url)  {
    window.open(url, "_blank", "noreferrer");
  }


  if (pluginState=="stopped" || pluginState=="unknown")
    return (<h3>Enable plugin to see configuration</h3>)
  else
  return(

    <div>
       <div className={classes.root}>
          
          <Button  variant="contained" onClick={()=>{openInNewTab("https://github.com/naugehyde/bt-sensors-plugin-sk/tree/1.2.0-beta#configuration")}}>Documentation</Button>
          <Button variant="contained"  onClick={()=>{openInNewTab("https://github.com/naugehyde/bt-sensors-plugin-sk/issues/new/choose")}}>Report Issue</Button>
          <Button variant="contained"  onClick={()=>{openInNewTab("https://discord.com/channels/1170433917761892493/1295425963466952725" )}}>Discord Thread</Button>
          <p></p>
          <p></p>
      </div>
      <hr style={{"width":"100%","height":"1px","color":"gray","background-color":"gray","text-align":"left","margin-left":0}}></hr>

      {error?<h2 style={{color: 'red'}}>{error}</h2>:""}
      <Form 
        schema={baseSchema}
        validator={validator}
        uiSchema={baseUISchema}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => { updateBaseData(formData); setSchema({}) } }

        onError={log('errors')}
        formData={baseData}
      />
    <hr style={{"width":"100%","height":"1px","color":"gray","background-color":"gray","text-align":"left","margin-left":0}}></hr>
      <p></p>
      <p></p>
      { (progress.deviceCount<progress.totalDevices)?
        <ProgressBar max={progress.maxTimeout} 
                     now={progress.progress} 
        />:""
      }
      <p></p>
      <Tabs
      defaultActiveKey="_configured"
      id="domain-tabs"
      className="mb-3"
  
      >
      {getTabs()}
      </Tabs>
      <div style= {{ paddingLeft: 10, paddingTop: 10, display: (Object.keys(schema).length==0)? "none" :""  }}>
      <Grid container direction="column" style={{spacing:5}}>
      <Grid item><h2>{schema?.title}</h2><p></p></Grid>
      <Grid item>{ReactHtmlParser(schema?.htmlDescription)}</Grid>
      </Grid>
    
    <Form
      schema={schema}
      validator={validator}
      uiSchema={uiSchema}
      onChange={(e) => {
          const s = sensorMap.get(e.formData.mac_address)
          if(s) {
            s._changesMade=true
            s.config = e.formData
            setSensorData(e.formData)
          }
        }
      }
      onSubmit={({ formData }, e) => {
        updateSensorData(formData)
        alert("Changes saved")
      }}
      onError={log('errors')}
      formData={sensorData}>
      <div className={classes.root}>
        <Button type='submit' color="primary" variant="contained">Save</Button>
        <Button variant="contained" onClick={()=>{undoChanges(sensorData.mac_address)}}>Undo</Button>
        <Button variant="contained" color="secondary" onClick={(e)=>confirmDelete(sensorData.mac_address)}>Delete</Button>
      </div>  
    </Form>

   
    </div>
    </div>
  )
    

  }
  export default BTConfig