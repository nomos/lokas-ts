export namespace dice {
    export function random(seed?) {
        if (seed===undefined) {
            return Math.random();
        }
        seed=(seed+1573)*(seed+125513)+seed*9301+149297;
        seed=Math.pow(seed*(seed+23623), 13)%233783;
        return seed/233783;
    }
    export function rngInt(val1, val2, seed?) {
        return parseInt(this.rng(val1, val2+1, seed));
    }
    export function rng(val1, val2, seed?) {
        let minVal=val1<val2 ? val1:val2;
        let maxVal=val1<val2 ? val2:val1;
        return minVal+(maxVal-minVal)*this.random(seed);
    }

    export function porn(seed?) {
        return this.one_in(2,seed)?-1:1;
    }

    export function one_in(chance, seed?) {
        return (chance<=1||this.rng(0, chance, seed)<1);
    }
    export function x_in_y(x, y, seed?) {
        return this.random(seed)<x/y;
    }
    export function weight_select(weightList, seed?:number):number {
        let sum=0;
        for (let i=0; i<weightList.length; i++) {
            sum+=weightList[i];
        }
        let rand=this.random(seed)*sum;
        let i:number;
        for (i = 0;i<weightList.length; i++) {
            let weight=weightList[i];
            if (weight>rand) {
                break;
            } else {
                rand-=weight;
            }
        }
        return i;
    }
    export function shuffle<T>(arr:Array<T>,seed?:number):Array<T> {

        if (!Array.isArray(arr)) {
            throw new Error('shuffle expect an array as parameter.');
        }
        let collection=arr;
        let len=arr.length;
        let random;
        let temp;

        while (len) {
            seed+=1
            random=Math.floor(this.random(seed)*len);
            len-=1;
            temp=collection[len];
            collection[len]=collection[random];
            collection[random]=temp;
        }
        return collection;
    }

    export function getOne<T>(arr:Array<T>, seed?:number) {
        if (!Array.isArray(arr)) {
            throw new Error('shuffle.pick() expect an array as parameter.');
        }

        let index = this.rngInt(0,arr.length-1,seed);
        return arr[index]
    }

    export function pickOne<T>(arr:Array<T>, seed?:number):T {
        if (!Array.isArray(arr)) {
            throw new Error('shuffle.pickOne() expect an array as parameter.');
        }
        let index = Math.floor(random(seed)*arr.length);
        let ret = arr[index];
        arr.splice(index,1);
        return ret;
    }
    export function pickSome<T>(arr:Array<T>, num:number,seed?:number):Array<T> {
        if (!Array.isArray(arr)) {
            throw new Error('shuffle.pickSome() expect an array as parameter.');
        }
        let ret=new Array<T>()
        for (let i=0;i<num;i++) {
            let index=Math.floor(arr.length*random(seed+i));
            ret.push(arr[index]);
            arr.splice(index, 1);
        }
        return ret
    }

}