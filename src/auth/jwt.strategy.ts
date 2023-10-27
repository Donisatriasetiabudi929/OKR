import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { Model } from "mongoose";
import { User } from "src/schema/user.schema";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectModel(User.name)
        private userModel: Model<User>,
    ) {
        super({
            //Untuk mengindikasi bahwa token akan di ekstrak di header autentikasi dalam bentuk bearer
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // untuk memverifikasi tanda tangan token JWT yang diterima dari pengguna.
            secretOrKey: process.env.JWT_SECRET,
        })
    }

    //Proses untuk memvalidasi CRUD dari token yang didapat
    async validate(payload) {
        const { id } = payload;

        //Untuk mencari user berdasarkan ID
        const user = await this.userModel.findById(id);
        //Kondisi jika tidak ada user yang login
        if (!user) {
            throw new UnauthorizedException('Login terlebih dahulu untuk mendapatkan akses');
        }


        //Kondisi jika Role user bukan admin
        if (user.role !== 'Admin') {
            throw new UnauthorizedException('Anda tidak memiliki izin akses sebagai Admin');
        }



        //Menampilkan user
        return user;
    }
}