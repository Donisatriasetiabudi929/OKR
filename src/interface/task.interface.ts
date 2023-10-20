import {Document} from 'mongoose'
export interface ITask extends Document{
    nama: string;
    deskripsi: string;
    readonly file: string;
    readonly link: string;
    readonly assign_to: string;
    readonly nama_profile: string;
    readonly foto_profile: string;
    readonly start_date: string;
    readonly end_date: string;
    status: string;
}