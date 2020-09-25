import {Logger,log} from "../utils/logger";

export namespace Http {
    export function Request(option, cb) {
        if (String(option)!=='[object Object]') return undefined;
        option.method=option.method ? option.method.toUpperCase():'GET';
        option.data=option.data||{};
        let formData=[];
        for (let key in option.data) {
            formData.push(''.concat(key, '=', option.data[key]));
        }
        option.data=formData.join('&');

        if (option.method==='GET') {
            option.url+=location.search.length===0 ? ''.concat('?', option.data):''.concat('&', option.data)
        }
        log.debug('http request',option.method,option.url,option.data);

        let xhr=new XMLHttpRequest();
        xhr.responseType=option.responseType||'json';
        xhr.onreadystatechange=function () {
            if (xhr.readyState===4) {
                if (xhr.status===200) {
                    if (cb&&typeof cb==='function') {
                        cb(xhr.response)
                    }
                } else {
                    if (cb&&typeof cb==='function') {
                        cb({code:400,msg:'Bad Request'});
                    }
                }
            }
        };
        xhr.open(option.method, option.url, true);
        if (option.method==='POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        }
        xhr.send(option.method==='POST' ? option.data:null)
    }
}