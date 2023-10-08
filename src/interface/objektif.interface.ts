import {Document} from 'mongoose'
export interface IObjektif extends Document{
    readonly id_projek: string;
    readonly nama: string;
    readonly status: string;
}