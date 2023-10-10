import { Body, Controller, Get, HttpStatus, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { ObjektifService } from './objektif.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateObjektifDto } from 'src/dto/create.objektif.dto';
import { Response } from 'express';


@Controller('objektif')
export class ObjektifController {
    constructor(private readonly objektifService: ObjektifService) { }

    @Post()
    @UseGuards(AuthGuard())
    async createObjektif(@Res() res: Response, @Body() createObjektifDto: CreateObjektifDto) {
        try {
            const newObjektif = await this.objektifService.createObjektif(createObjektifDto);
            return res.status(HttpStatus.CREATED).json({
                message: "Berhasil menambahkan data objektif",
                newObjektif
            });
        } catch (err) {
            if (err.message === 'Objektif dengan nama tersebut sudah ada') {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error Objektif not created",
                    error: 'Objektif dengan nama tersebut sudah ada'
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 400,
                    message: "Error objektif not created",
                    error: 'Bad request'
                });
            }
        }
    }

    @Put('/:id')
    //Untuk memanggil keamanan authorisasi auth
    @UseGuards(AuthGuard())
    async updateStudent(@Res() Response, @Param('id') objektifId: string,
        @Body() createObjektifDto: CreateObjektifDto) {
        //req Req untuk mengakses dan manipulasi informasi yang dikirimkan
        try {
            //Untuk menampilkan data user di console
            const existingObjektif = await this.objektifService.updateObjektif(objektifId, createObjektifDto);
            return Response.status(HttpStatus.OK).json({
                message: 'Objektif berhasil di update',
                existingObjektif
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get()
    async getProjeks(@Res() Response) {
        try {
            const objekData = await this.objektifService.getAllObjek();
            return Response.status(HttpStatus.OK).json({
                message: 'Semua data objek berhasil ditemukan', objekData
            });
        } catch (err) {
            return Response.status(err.status).json(err.Response);
        }
    }

    @Get('/:id')
    async getProjekById(@Param('id') id: string, @Res() Response) {
        try {
            const objek = await this.objektifService.getObjek(id);

            if (!objek) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data objektif tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data objektif berhasil ditemukan',
                objek
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data objektif'
            });
        }
    }

    @Get('/projek/:id_projek')
    async getKeyresultsByProjekId(@Param('id_projek') idProjek: string, @Res() Response) {
        try {
            const objektif = await this.objektifService.getObjekByProjekId(idProjek);

            if (!objektif) {
                return Response.status(HttpStatus.NOT_FOUND).json({
                    message: 'Data objektif tidak ditemukan'
                });
            }

            return Response.status(HttpStatus.OK).json({
                message: 'Data objektif berhasil ditemukan',
                objektif
            });
        } catch (err) {
            return Response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Terjadi kesalahan saat mengambil data objektif'
            });
        }
    }


}
