import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { IProgres } from 'src/interface/progres.interface';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

@WebSocketGateway()
export class ProgresGateway {
    private readonly Redisclient: Redis;

    constructor(
        @InjectModel('Progres') private progresModel: Model<IProgres>
    ) {
        this.Redisclient = new Redis({
            port: 6379,
            host: '127.0.0.1',
            password: '',
            username: '',
            // Optional
            db: 1
        });
    }

    @WebSocketServer()
    server: Server;

    onModuleInit() {
        this.server.on('connection', (socket) => {
            console.log(socket.id);
            console.log('Connected');
        });
    }

    @SubscribeMessage('newMessage')
    async onNewMessage(@MessageBody() body: any) {
        console.log(body);

        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();
        const detik = now.getSeconds();

        const idProfile = body.id_profile;
        const notificationKey = `009:notif:${idProfile}`;

        const notification = {
            for: `${body.id_profile}`,
            content: `Selamat ${body.nama_profile}, Admin telah melakukan Approve progres mu pada pukul ${jam}:${menit}:${detik}`,
        };

        // Store notification in Redis with expiration time of 1 day (in seconds)
        await this.Redisclient.setex(notificationKey, 86400, JSON.stringify(notification));

        // Emit notification to connected clients
        this.server.emit('onMessage', notification);

        await this.updateCache();

    }

    async getStoredNotifications(idProfile: string): Promise<any[]> {
        const notificationKey = `009:notif:${idProfile}`;
        const notification = await this.Redisclient.get(notificationKey);

        return notification ? [JSON.parse(notification)] : [];
    }

    async updateCache(): Promise<void> {
        try {
            const uploudData = await this.progresModel.find();
            if (!uploudData || uploudData.length === 0) {
                throw new NotFoundException('Data uploud tidak ada!');
            }
    
            for (const data of uploudData) {
                const idProfile = data.id_profile;
                const notificationKey = `009:notif:${idProfile}`;
                
                const now = new Date();
                const jam = now.getHours();
                const menit = now.getMinutes();
                const detik = now.getSeconds();
    
                const notification = {
                    for: `${data.id_profile}`,
                    content: `Selamat ${data.nama_profile}, Admin telah melakukan Approve progres mu pada pukul ${jam}:${menit}:${detik}`,
                };
    
                // Simpan data dari database ke cache dan atur waktu kedaluwarsa
                await this.Redisclient.setex(notificationKey, 3600, JSON.stringify(notification)); // 3600 detik = 1 jam
                console.log(`Cache Redis (key ${notificationKey}) telah diperbarui dengan data terbaru dari MongoDB`);
            }
        } catch (error) {
            console.error(`Error saat memperbarui cache Redis: ${error}`);
            throw new Error('Terjadi kesalahan saat memperbarui cache Redis');
        }
    }
    

}
