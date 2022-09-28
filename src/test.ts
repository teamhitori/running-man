import { mergeObj } from "./components/utils/mergeObj";


var a = {
    1: {
        2: { 3: "4" }
    }
}

var a1 = ["a", { b: "c"}]

var b = {
    1: {
        'a': 'b'
    },
    4: {
        3: "2",
        1: {
            0: "0"
        }
    }
}

console.log("before", a1, b);

var res = mergeObj(a1, b)

console.log("res", res);

