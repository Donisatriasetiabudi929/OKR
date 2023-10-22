import {Document} from 'mongoose'
export interface IProgrestask extends Document{
    readonly id_task: string;
    readonly id_profile: string;
    readonly nama_profile: string;
    readonly foto_profile: string;
    readonly tanggal: string;
    note: string;
    readonly files: string[];
    readonly link: string;
    status: string;

}