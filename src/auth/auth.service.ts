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
import { Redis } from 'ioredis';
import { IProfile } from 'src/interface/profile.interface';



@Injectable()
export class AuthService {
    private readonly Redisclient: Redis;
    //Untuk menyuntikkan model pengguna serta layanan JWT
    constructor(
        @InjectModel(User.name)
        private userModel: Model<User>,
        private jwtService: JwtService,
        @InjectModel('Profile') private profileModel: Model<IProfile>,
    ) {
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            //Optional
            db: 1
        });
    }

    async getUser(userId: string): Promise<IUser> {
        const existingUser = await this.userModel.findById(userId)
        if (!existingUser) {
            throw new NotFoundException(`User dengan #${userId} tidak tersedia`);
        }
        return existingUser;
    }

    async getAllUser(): Promise<IUser[]> {
        const cachedData = await this.Redisclient.get('005');

        if (cachedData) {
            return JSON.parse(cachedData);
        } else {
            const userData = await this.userModel.find()
            if (!userData || userData.length == 0) {
                throw new NotFoundException('Data user tidak ada!');
            }
            await this.Redisclient.setex('005', 3600, JSON.stringify(userData));
            return userData;
        }
    }

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.userModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
            // Simpan data dari database ke cache dan atur waktu kedaluwarsa
            await this.Redisclient.setex('005', 3600, JSON.stringify(uploudData)); // 3600 detik = 1 jam
            console.log('Cache Redis (key 005) telah diperbarui dengan data terbaru dari MongoDB');
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis (key 005): ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
        }
    }
    async deleteCache(key: string): Promise<void> {
        try {
            await this.Redisclient.del(key);
            console.log(`Cache dengan key ${key} telah dihapus dari Redis`);
        } catch (error) {
            console.error(`Error saat menghapus cache dari Redis: ${error}`);
            throw new Error('Terjadi kesalahan saat menghapus cache dari Redis');
        }
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
            role: 'Pekerja',
        });
        const token = this.jwtService.sign({ id: user._id });
        await this.updateCache();
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


    async updateUserById(userId: string, updateData: UpdateUserDto): Promise<IUser> {
        const { name, password, role } = updateData;
        const updateFields: any = {}; // Objek untuk menyimpan bidang yang akan diperbarui
    
        if (name) {
            updateFields.name = name;
        }
    
        if (role) {
            updateFields.role = role;
        }
    
        if (password) {
            if (password.length < 6) {
                const errorMessage = 'Perbarui gagal, password minimal 6 karakter';
                console.error(errorMessage);
                throw new BadRequestException(errorMessage);
            }
    
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.password = hashedPassword;
        }
    
        const existingUser = await this.userModel.findByIdAndUpdate(userId, updateFields, { new: true });
        if (!existingUser) {
            throw new NotFoundException(`User dengan ID #${userId} tidak ditemukan`);
        }
    
        await this.deleteCache(`005`);
        return existingUser;
    }
    



    //Untuk proses login
    async login(loginDto: LoginDto): Promise<{ token: string }> {
        //Yang di input
        const { name, password } = loginDto;

        //untuk mencari user berdasarkan email
        const user = await this.userModel.findOne({ name });
        //Jika tidak ada data user yang sesuai
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        //Untuk melakukan compare / mencocokkan antara password dengan hasil hash yang ada di database
        const isPasswordMatched = await bcrypt.compare(password, user.password);
        //Jika password tidak match
        if (!isPasswordMatched) {
            throw new UnauthorizedException('Invalid email or password');
        }

        //Untuk menghasilkan token perID
        const token = this.jwtService.sign({ id: user._id });
        //Untuk menampilkan token
        return { token };
    }









}
