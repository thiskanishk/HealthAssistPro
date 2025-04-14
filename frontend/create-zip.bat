@echo off
powershell -Command "Compress-Archive -Path src,public,package.json,tsconfig.json,.env.production,vercel.json,DEPLOYMENT.md -DestinationPath frontend.zip -Force"
echo Done! Your zip file is ready: frontend.zip 