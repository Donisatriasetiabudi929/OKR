import { Document } from 'mongoose'
export interface IKeyresult extends Document {
    id_projek: string;
    id_objek: string;
    nama: string;
    file: string;
    link: string;
    assign_to: string;
    nama_profile: string;
    foto_profile: string;
    target_value: string;
    days: string;
    current_value: number;
    status: string;
}