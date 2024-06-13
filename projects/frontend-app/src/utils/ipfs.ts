import axios from "axios"
// import { EventTypeJson } from "../types/models";
import CryptoES from 'crypto-es';
const JWT = `Bearer ${import.meta.env.VITE_PINATA_JWT}`

export async function axiosToIpfs(selectedFile: File) {
    const formData = new FormData();

    formData.append('file', selectedFile);

    const metadata = JSON.stringify({
        name: selectedFile.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            // maxBodyLength: "Infinity",
            headers: {
                'Content-Type': `multipart/form-data; boundary=${(formData as any)._boundary}`, 
                Authorization: JWT
            }
        });
        console.log(res.data);
        return(res.data as PinataResponse)
    } catch (error) {
        console.log(error);
    }
}
    

export async function uploadToIpfs(file: File): Promise<string> {
    const results = await axiosToIpfs(file)
    return results!.IpfsHash
}

type PinataResponse = {
    IpfsHash: string
    PinSize: number
    Timestamp: Date
}

export async function uploadJson(obj: Object): Promise<string | undefined> {
    let rootCid = ""
    try {
        //const obj = { hello: 'world' }
        const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
        // console.log(`${import.meta.env.VITE_WEB3_API}`)
        const upFile = new File([blob], 'item.json')
        const info = await axiosToIpfs(upFile)
        rootCid = info!.IpfsHash
        console.log(`status info ${info}`)
    } catch (e: any) {
        console.error(e);
    }
    return rootCid
};


export async function getJsonData(cid: string){
    const x = await fetch(ipfsUrl(cid))
    const json = await x.json()
    // console.log(json)
    return json;
}

export async function hashJsonData(cid: string): Promise<string> {
    const obj = await getJsonData(cid)
    const json = JSON.stringify(obj)
    const hash = CryptoES.SHA3(json, { outputLength: 256 });
    return hash.toString();
}

export function hashObj(obj: any){
    const json = JSON.stringify(obj)
    const hash = CryptoES.SHA3(json, { outputLength: 256 });
    return hash.toString();
}

export function ipfsUrl(cid: string) {
    // const url = `https://gateway.pinata.cloud/ipfs/${cid}`
    const url = `https://ipfs.io/ipfs/${cid}`
    return url;
}