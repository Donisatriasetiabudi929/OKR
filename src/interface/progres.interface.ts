import { Document } from 'mongoose'
export interface IProgres extends Document {
    readonly id_projek: string;
    readonly id_objek: string;
    readonly id_keyresult: string;
    readonly id_profile: string;
    readonly nama_profile: string;
    readonly foto_profile: string;
    readonly tanggal: string;
    nama: string;
    deskripsi: string;
    readonly total: number;
    file: string;
    readonly link: string;
    approve_time: string;
    status: string;
}