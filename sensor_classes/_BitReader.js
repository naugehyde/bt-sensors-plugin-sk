
class _BitReader{
    constructor( data){
        this._data = data
        this._index = 0
    }
    read_bit(){
        const bit = (this._data[this._index >> 3] >> (this._index & 7)) & 1
        this._index++
        return bit
    }

    read_unsigned_int(num_bits){
        var value =''
        for (let i = 0; i < num_bits; i++)
            value = this.read_bit().toString()+value
        return parseInt(value,2)
    }
    read_signed_int(num_bits){ 
        const value = this.read_unsigned_int(num_bits)
        return value & (1 << (num_bits - 1))?value - (1 << num_bits):value
    }
    
}

module.exports=_BitReader