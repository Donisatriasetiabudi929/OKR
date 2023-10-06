import { Controller, Post, Body, Get, Put, Res, Param, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';
import { UpdateUserDto } from 'src/dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor( private authService: AuthService ){}

    //Untuk menangani permintaan HTTP POST
    @Post('/signup')    
    @UseGuards(AuthGuard())
    signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
    return this.authService.signUp(signUpDto);
    }


    //Untuk mengedit role user
    //Untuk menangani permintaan HTTP PUT
    @Put('/:id')
    //Untuk memvalidasi keamanan authorization
    @UseGuards(AuthGuard())
    async updateUser(@Res() Response, @Param('id') userId: string, @Body() updateUserDto: UpdateUserDto, @Req() Req){
        try{
            const existingUser = await this.authService.updateUser(userId, updateUserDto);
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil update role',
                existingUser,
                user: Req.user //Untuk menampilkan siapa user yang mengedit
            });
        }catch(err){
            return Response.status(err.status).json(err.Response);
        }
    }

    //Untuk menangani permintaan HTTP GET
    @Post('/login')
    login(@Body() loginDto: LoginDto): Promise<{ token: string }>{
        return this.authService.login(loginDto);
    }


    @Get('/:id')
    async getUserById(@Param('id') id: string, @Res() Response) {
        try {
            const user = await this.authService.getUser(id);

            if (!user) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data user tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data user berhasil ditemukan',
                user
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data user'
            });
        }
    }
}

