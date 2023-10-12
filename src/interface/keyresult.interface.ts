import {Document} from 'mongoose'
export interface IKeyresult extends Document{
    readonly id_projek: string;
    readonly id_objek: string;
    readonly nama: string;
    readonly file: string;
    readonly link: string;
    readonly assign_to: string;
    readonly nama_profile: string;
    readonly foto_profile: string;
    readonly target_value: string;
    current_value: number;
    readonly status: string;
}