'use client';

import { Upload, message } from 'antd';
import type { UploadFile, UploadChangeParam } from 'antd/lib/upload/interface';
import type { PutBlobResult } from '@vercel/blob';
import { Button, Card, CardFooter } from '@nextui-org/react';
import { upload } from '@vercel/blob/client';
import { Loader2Icon, Play, UploadCloudIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import Image from 'next/image';
import { io } from 'socket.io-client';
import { Item } from '@/components/VideoPlayer';
import Dragger from 'antd/es/upload/Dragger';


const ffmpeg = new FFmpeg();

export default function AvatarUploadPage() {
  const [blob, setBlob] = useState<(PutBlobResult & { thumbnail?: string }) | null>(null);

  const handleFileChange = async (info: UploadChangeParam<UploadFile>) => {
    const { file } = info;
    if (file.status === 'done') {
      
      if (file?.type?.split('/')[0] === 'video') {
        await ffmpeg.load();
        const newBlob = await upload(file.name, file.originFileObj as File, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
          contentType: file.type,
        });
        await ffmpeg.writeFile(file.name, await fetchFile(file.originFileObj as File));
        const outputFilename = `${file.name.split('.')?.at(-2)}.png`;
        await ffmpeg.exec(['-i', file.name, '-ss', `0`, '-frames:v', '1', outputFilename]);
        const data = await ffmpeg.readFile(outputFilename);

        const thumbnail = await upload(`.thumbnail/${outputFilename}`, (data as Uint8Array).buffer, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
        });
        setBlob({ ...newBlob, thumbnail: thumbnail.url });
      } else if (file?.type?.split('/')[0] === 'image') {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as File);
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, {
          transports: ['websocket'],
        });

        reader.onloadend = async () => {
          const base64 = reader.result;
          socket?.emit('send_data', { data: base64 });
        };

        socket?.on('data_processed', (data: Item[]) => {
          // UI need to be made for this
          console.log(data);
        });

        setTimeout(() => {
          socket?.disconnect();
        }, 10000);
      } else {
        alert('Invalid file type');
      }
    }
  };

  return (
    <div
      className='relative w-screen h-screen bg-cover bg-center bg-black bg-opacity-50'
      style={{
        backgroundImage:
          "url('https://e0.pxfuel.com/wallpapers/724/281/desktop-wallpaper-get-amazon-prime-video-for-windows-amazon.jpg')",
      }}
    >
      <div className='bg-gradient-to-r from-black via-slate-900 bg-opacity-50 w-full h-full'>
        <header className='flex justify-between items-center z-10 h-12 w-full bg-cyan-600 px-64'>
          <Link href='/' className='text-white text-2xl'>
            prime video
          </Link>
          <div className='flex space-x-4'>
            <Button as='a' href='/upload' variant='light' style={{ color: 'white' }}>
              Upload <UploadCloudIcon size={24} />
            </Button>
          </div>
        </header>
        <main className='relative p-12 flex flex-col justify-between h-4/5 z-10'>
          <div>
            <h1 className='text-4xl font-bold'>Upload Videos your own videos</h1>
            <p className='w-3/5 my-6'>
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
              industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and
              scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into
              electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release
              of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software
              like Aldus PageMaker including versions of Lorem Ipsum
            </p>
            <p className='w-3/5 my-4'>
              using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using
              Content here, content here, making it look like readable English. Many desktop publishing packages and web
              page editors now use Lorem Ip
            </p>
          </div>
          <div>
            <div className='w-[40%] h-full'>
              <Dragger
                className='text-white rounded-lg bg-black hover:bg-zinc-800 transition-colors'
                listType='text'
                onChange={handleFileChange}
                showUploadList={{ showPreviewIcon: true, showRemoveIcon: false }}
              >
                  <UploadCloudIcon size={36}/>
                  <div className='text-sm'>
                    Click or drag
                    <br /> file to upload
                  </div>
              </Dragger>
            </div>
            {/* UI for Image upload results need to be made */}

            {blob && (
              <Link
                href={{
                  pathname: '/stream',
                  query: {
                    url: blob?.url,
                    pathname: blob?.pathname,
                    size: 'NA',
                    uploadedAt: 'Now',
                  },
                }}
              >
                <Card
                  key={blob?.pathname}
                  isHoverable
                  isPressable
                  radius='lg'
                  className='border-none w-52 justify-center bg-cyan-600 hover:scale-110'
                >
                  <div className='relative'>
                    <Image
                      // loading='lazy'
                      alt={blob?.pathname ?? 'Video'}
                      className='object-cover'
                      height={500}
                      src={
                        blob?.thumbnail ??
                        'https://d8it4huxumps7.cloudfront.net/uploads/images/663c619d69486_hackon-with-amazon-season-4.jpg?d=1920x1920'
                      }
                      width={500}
                    />
                    <div className='absolute inset-0 flex z-10 items-center justify-center rounded-xl bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity'>
                      <Play size={48} color='white' />
                    </div>
                  </div>
                  <CardFooter className='justify-between'>
                    <p className='text-small text-white text-wrap'>
                      {blob?.pathname.split('/').pop()?.split('.')?.at(-2)}
                    </p>
                  </CardFooter>
                </Card>
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
