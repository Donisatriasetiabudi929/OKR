import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/schema/user.schema';
import { SignUpDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';
import { UpdateUserDto } from 'src/dto/update-user.dto';
import { IUser } from 'src/interface/user.interface';

@Injectable()
export class AuthService {
    //Untuk menyuntikkan model pengguna serta layanan JWT
    constructor(
        @InjectModel(User.name)
        private userModel: Model<User>,
        private jwtService: JwtService,
    ){}

    async getUser(userId:string):Promise<IUser>{
        const existingUser = await this.userModel.findById(userId)
        if (!existingUser){
            throw new NotFoundException(`User dengan #${userId} tidak tersedia`);
        }
        return existingUser;
    }

    //Untuk melakukan proses signup
    async signUp(signUpDto: SignUpDto): Promise<{ token: string }> {
        const { name, password, confirmPassword } = signUpDto;
        // Periksa apakah password dan konfirmasi password cocok
        if (password !== confirmPassword) {
            throw new BadRequestException('Password dan konfirmasi password tidak cocok');
        }
        const existingUser = await this.userModel.findOne({ name });
        if (existingUser) {
            throw new NotFoundException('Data dengan name yang anda input, sudah terdaftar!!!'); 
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            name,
            password: hashedPassword,
            role: 'public', 
        });
        const token = this.jwtService.sign({ id: user._id });
        return { token };
    }   

    
    async getUserById(id: string) {
    const user = await this.userModel.findById(id).exec();
    return user;
  }

  async getUserFromToken(token: string): Promise<{ id_user: string, role: string }> {
    const payload = this.jwtService.verify(token);
    
    const user = await this.getUserById(payload.id);

    if (!user || !user.name) {
      throw new Error('User not found or name is missing');
    }

    return { id_user: payload.id, role: user.role };
  }
    

// ...


    async updateUser(userId: string, updateUserDto: UpdateUserDto):Promise<IUser>{
        const existingUser = await this.userModel.findByIdAndUpdate(userId, updateUserDto, {new: true});
        if (!existingUser) {
            throw new NotFoundException(`User #${userId} tidak tersedia!`);
        }
        return existingUser;
    }

    //Untuk proses login
    async login (loginDto: LoginDto): Promise<{ token: string }> {
        //Yang di input
        const {name, password} = loginDto;

        //untuk mencari user berdasarkan email
        const user = await this.userModel.findOne({name});
        //Jika tidak ada data user yang sesuai
        if(!user){
            throw new UnauthorizedException('Invalid email or password');
        }

        //Untuk melakukan compare / mencocokkan antara password dengan hasil hash yang ada di database
        const isPasswordMatched = await bcrypt.compare(password, user.password);
        //Jika password tidak match
        if(!isPasswordMatched){
            throw new UnauthorizedException('Invalid email or password');
        }

        //Untuk menghasilkan token perID
        const token = this.jwtService.sign({ id: user._id });
        //Untuk menampilkan token
        return { token } ;
    }


    
    
    



    
}
