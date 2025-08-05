function bindThisToThat(obj1, obj2){
        for (let method of getInstanceMethodNames(obj1)) {
            obj1[method]=obj1[method].bind(obj2)
        }
}

function getInstanceMethodNames (obj) {
    return Object
        .getOwnPropertyNames (Object.getPrototypeOf (obj))
        .filter(name => (name !== 'constructor' && typeof obj[name] === 'function'));
}

class Mixin{
    constructor(obj){
        bindThisToThat(this, obj)
    }
}

module.exports=Mixin