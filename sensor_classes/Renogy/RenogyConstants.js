RENOGY_CONSTANTS={
    FUNCTION:
    {
        3: "READ",
        6: "WRITE"
    },

CHARGING_STATE:
 {
    0: 'deactivated',
    1: 'activated',
    2: 'mppt',
    3: 'equalizing',
    4: 'boost',
    5: 'floating',
    6: 'current limiting'
},

LOAD_STATE: {
  0: 'off',
  1: 'on'
},

BATTERY_TYPE: {
    1: 'flooded/open',
    2: 'sealed',
    3: 'gel',
    4: 'lithium',
    5: 'custom'
}
}
module.exports=RENOGY_CONSTANTS