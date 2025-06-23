RENOGY_CONSTANTS={
    FUNCTION:
    {
        3: "READ",
        6: "WRITE"
    },

CHARGING_STATE:
 {
    0: 'Deactivated',
    1: 'Activated',
    2: 'MPPT',
    3: 'Equalizing',
    4: 'Boost',
    5: 'Floating',
    6: 'Current limiting',
    8: 'Not charging'
},

LOAD_STATE: {
  0: 'Off',
  1: 'On'
},

BATTERY_TYPE: {
    1: 'Flooded/Open',
    2: 'Sealed',
    3: 'Gel',
    4: 'Lithium',
    5: 'Custom'
}
}
module.exports=RENOGY_CONSTANTS