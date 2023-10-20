import {Document} from 'mongoose'
export interface IObjektif extends Document{
    readonly id_projek: string;
    readonly nama: string;
    readonly start_date: string;
    readonly end_date: string;
    status: string;
}