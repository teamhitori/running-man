export function mergeObj(objA: { [key: string]: any }, objB: { [key: string]: any }): { [key: string]: any } {

    var tryMerge = (objA: any, objB: any, i: number): any => {
        //console.log("");
        // console.log(`try merge, ${i}`, objA, objB);

        //console.log("objA", objA);
        //console.log("objB", objB);

        var objANew: any = {};

        for (const key in objA) {
            if (Object.prototype.hasOwnProperty.call(objA, key)) {
                var elA = objA[key];
                var elB = objB[key];

                // console.log(`objA is array:${Array.isArray(objA)}, key:${key}, value:${elA}`);

                if (elB && typeof elB === 'object' && elB !== null && !Array.isArray(elA) && !Array.isArray(elB) && !Array.isArray(objA) && !Array.isArray(objB) ) {
                    objANew[key] = tryMerge(elA, elB, i + 1);
                } else {
                    objANew[key] = elA;
                }
            }
        }

        for (const key in objB) {
            if (Object.prototype.hasOwnProperty.call(objB, key)) {
                var elA = objA[key];
                var elB = objB[key];

                //console.log(`objB is array:${Array.isArray(objB)}, key:${key}, value:${elB}`);

                if (elA) {
                    if (typeof elA === 'object' && elA !== null && !Array.isArray(elA) && !Array.isArray(elB) && !Array.isArray(objA) && !Array.isArray(objB) ) {
                        objANew[key] = tryMerge(elA, elB, i + 1);
                    } else {
                        if (elA != elB) {

                            //console.log(`${elA} != ${elB}`, objANew[key])

                            if (key in objANew) {

                                //console.log(`${objANew[key]} exists, isArray? ${Array.isArray(objANew[key])}`)

                                if (Array.isArray(objANew[key]) && objANew[key].length && Array.isArray(objANew[key][0]) == Array.isArray(elB)) {

                                    if(!objANew[key].some((x:any) => x == elB || (Array.isArray(x) && x.every((xIn:any, i:number) => elB[i] == xIn )))) {
                                        objANew[key].push(elB);
                                    }
                                } else {
                                    var val = objANew[key];
                                    objANew[key] = [];
                                    objANew[key].push(val, elB)
                                }

                            } else {
                                objANew[key] = elB;
                            }
                        }
                    }
                } else {
                    objANew[key] = elB
                }

            }
        }

        // console.log("objANew", objANew);

        // console.log(`============= eo ${i} ======`);

        // console.log(`result ${i}`, objANew);

        return objANew

    }

    var res = tryMerge(objA, objB, 0);

    return res;
}