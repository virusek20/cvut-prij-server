// This map is made specifically for websockets since it uses their ID
// Comparing websockets as they are is unreliable!

export default class TwoWayMap {
    map = {};
    reverseMap = {};

    add(key, value) {
        this.map[key] = value;
        this.reverseMap[value.id] = key;
    }

    remove(key) {
        const value = this.map[key];
        delete this.reverseMap[value.id];
        delete this.map[key]
    }

    revRemove(value) {
        const key = this.reverseMap[value.id];
        delete this.reverseMap[value.id];
        delete this.map[key]
    }

    get(key) {
         return this.map[key];
    }

    revGet(value) {
        return this.reverseMap[value.id];
    }
}