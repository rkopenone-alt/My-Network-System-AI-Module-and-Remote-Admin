@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
set "ANDROID_HOME=C:\Users\Alienware\AppData\Local\Android\Sdk"

echo Deep cleaning rescuer-app...
rmdir /s /q "rescuer-app\android\app\build"
rmdir /s /q "rescuer-app\android\.gradle"
rmdir /s /q "rescuer-app\android\app\.cxx"

echo Deep cleaning public-sos-app...
rmdir /s /q "public-sos-app\android\app\build"
rmdir /s /q "public-sos-app\android\.gradle"
rmdir /s /q "public-sos-app\android\app\.cxx"

echo Building rescuer-app APK...
cd rescuer-app\android
call gradlew assembleRelease --no-daemon
if %errorlevel% neq 0 exit /b %errorlevel%
cd ..\..

echo Building public-sos-app APK...
cd public-sos-app\android
call gradlew assembleRelease --no-daemon
if %errorlevel% neq 0 exit /b %errorlevel%
cd ..\..

echo Copying APKs...
python copy_apks.py
