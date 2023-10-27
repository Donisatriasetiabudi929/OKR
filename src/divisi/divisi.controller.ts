import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { DivisiService } from './divisi.service';
import { CreateDivisiDto } from 'src/dto/create.divisi.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('divisi')
export class DivisiController {
    constructor(private readonly divisiService: DivisiService) { }

    //Create divisi endpoint
    @Post()
    @UseGuards(AuthGuard())
    async createDivisi(@Res() Response, @Body() createDivisiDto: CreateDivisiDto) {
        try {
            const newDivisi = await this.divisiService.createDivisi(createDivisiDto);
            return Response.status(HttpStatus.CREATED).json({
                message: "Berhasil menambahkan data divisi",
                newDivisi
            });
        } catch (err) {
            if (err.message === 'Divisi dengan nama tersebut sudah ada') {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error division not created",
                    error: 'Divisi dengan nama tersebut sudah ada'
                });
            } else {
                return Response.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error divisi not created",
                    error: 'Bad request'
                });
            }
        }
    }


    //Show all Divisi endpoint
    @Get()
    async getDivisis(@Res() Response) {
        try {
            const divisiData = await this.divisiService.getAllDivisi();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data divisi berhasil ditemukan', divisiData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    //Delete Divisi endpoint
    @Delete('/:id')
    @UseGuards(AuthGuard())
    async deleteDivisi(@Res() Response, @Param('id') divisiId: string) {
        try {
            const deletedDivisi = await this.divisiService.deleteDivisi(divisiId)
            return Response.status(HttpStatus.OK).json({
                message: 'Berhasil hapus data Divisi',
                deletedDivisi,
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response)
        }
    }

}
