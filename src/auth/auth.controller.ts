import { Controller, Post, Body, Get, Put, Res, Param, HttpStatus, UseGuards, Req, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';
import { UpdateUserDto } from 'src/dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { BadRequestException } from '@nestjs/common';


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    //Untuk menangani permintaan HTTP POST
    @Post('/signup')
    @UseGuards(AuthGuard())
    signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
        return this.authService.signUp(signUpDto);
    }


    

    @Get('/all')
    async getUplouds(@Res() Response) {
        try {
            const userData = await this.authService.getAllUser();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data user berhasil di temukan', userData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Put('/:id')
    @UseGuards(AuthGuard())
async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Res() Response) {
    try {
        const updatedUser = await this.authService.updateUserById(id, updateUserDto);

        return Response.status(HttpStatus.OK).json({
            message: 'Data user berhasil diperbarui',
            user: updatedUser
        });
    } catch (err) {
        return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat memperbarui data user'
        });
    }
}



    //Untuk menangani permintaan HTTP GET
    @Post('/login')
    login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
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

    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteUser(@Res() Response, @Param('id') userId: string) {
        try {
            // Dapatkan data uploud berdasarkan ID
            const deletedUser = await this.authService.deleteUser(userId);
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data uploud',
                deletedUser
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat menghapus data uploud'
            });
        }
    }
}

