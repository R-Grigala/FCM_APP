# FCM და ლოკაცია

Expo და React Native აპი Firebase Cloud Messaging-ის ტოკენის მისაღებად, ლოკაციის მისაღებად და სერვერზე გასაგზავნად. აპი ასევე იღებს FCM შეტყობინებებს და აჩვენებს ბოლო შეტყობინებას.

## სერვერის მისამართი

სერვერის მისამართი აპში აღარ იწერება. შეცვალეთ `API_BASE_URL` მნიშვნელობა [src/config.ts](src/config.ts)-ში და მიუთითეთ API-ის ძირითადი URL, მაგალითად `https://api.example.com`. მისამართი უნდა იყოს ხელმისაწვდომი ტელეფონიდან. ლოკალური ქსელის სერვერის გამოყენებისას ჩაწერეთ კომპიუტერის LAN IP და პორტი; `localhost` ტელეფონის საკუთარ მოწყობილობას ნიშნავს.

მისამართი კოდში კონფიგურაციაა და საიდუმლო გასაღებებს არ უნდა შეიცავდეს. აპი backend-ის `/api/v1/devices/`, `/api/v1/devices/<device_id>/location/` და `/api/v1/devices/<device_id>/fcm-tokens/` endpoint-ებს იყენებს. სერვერის API აღწერილია [docs/server-api.md](docs/server-api.md)-ში.

## გაშვება და დაყენება

1. დააყენეთ npm პაკეტები: `npm install`.
2. Firebase Console-ში შექმენით Android აპი `com.fcmapp.location` პაკეტის სახელით და განათავსეთ `google-services.json` პროექტის root-ში.
3. iOS-ისთვის შექმენით Firebase აპი `com.fcmapp.location` bundle ID-ით და განათავსეთ `GoogleService-Info.plist` root-ში.
4. შეასწორეთ სერვერის endpoint `src/config.ts`-ში.
5. შექმენით და დააინსტალირეთ development build, რადგან React Native Firebase Expo Go-ში არ მუშაობს. Android-ისთვის: `npx expo run:android`. iOS-ისთვის macOS/Xcode-ზე: `npx expo run:ios`; ან გამოიყენეთ EAS development build.
6. გაუშვით Metro development build-ისთვის: `npx expo start --dev-client`.

კონფიგურაციის დეტალები იხილეთ [docs/development.md](docs/development.md)-ში.

## აპის ქცევა

- მთავარ ეკრანსა და „პარამეტრების“ ჩანართს შორის აპის ქვედა ტაბით გადაერთეთ; გაზიარების და შეტყობინებების გადამრთველები პარამეტრების ჩანართშია.
- ლოკაციის გაზიარების გადამრთველი ითხოვს foreground ლოკაციის ნებართვას და სერვერს უგზავნის გაზიარების მიმდინარე მდგომარეობას.
- ლოკაციის გაზიარების გამორთვისას აპი აღარ კითხულობს და აღარ აგზავნის კოორდინატებს.
- შეტყობინებების გადამრთველი ჩართვისას აგზავნის device-ის რეგისტრაციას და FCM ტოკენს სერვერზე ცალკე მოთხოვნით; გამორთვისას სერვერიდან შლის device-ის FCM token-ებს და შემდეგ შლის ლოკალურ Firebase ტოკენს.
- გაზიარების ჩართვისას მიმდინარე კოორდინატები მაშინვე იგზავნება; გაზიარების ჩართულ მდგომარეობაში აპის გახსნისასაც კოორდინატები ახლდება. მომხმარებელს მათი ხელახლა გაგზავნა მთავარ ეკრანზე არსებული ღილაკითაც შეუძლია. ფონურად კოორდინატები არ იგზავნება.
- აპის გაშვებისას ჯერ მოწმდება device-ის რეგისტრაცია `GET /api/v1/devices/<device_id>`-ით; მხოლოდ არარსებობის შემთხვევაში იქმნება ახალი backend ჩანაწერი. შემდეგ მოწმდება push notification და location sharing-ის მდგომარეობა.
- მოწყობილობის `device_id` ინსტალაციაზე ერთხელ იქმნება და AsyncStorage-ში ინახება.
- FCM ტოკენი აპში ჩანს და კოპირება შეიძლება.
- FCM background handler და push notification-ები მოითხოვს development build-ს.

## კოდის პასუხისმგებლობები

- [App.tsx](App.tsx) მართავს მთავარ ეკრანს, FCM token-ის ჩვენებას, ლოკაციის მიღებასა და ხელით გაგზავნას.
- [src/components/SettingsScreen.tsx](src/components/SettingsScreen.tsx) მართავს ლოკაციისა და push notification-ის პარამეტრებს.
- [src/deviceInit.ts](src/deviceInit.ts) ქმნის/კითხულობს device ID-ს და არეგისტრირებს მოწყობილობას backend-ზე.
- [src/sendFcmToken.ts](src/sendFcmToken.ts) აგზავნის და შლის FCM token-ებს backend-ზე.
- [src/sendLocation.ts](src/sendLocation.ts) აგზავნის ლოკაციის გაზიარების სტატუსსა და კოორდინატებს.
- [src/storage.ts](src/storage.ts) ინახავს device ID-ს, პარამეტრებსა და ბოლო მიღებულ შეტყობინებას AsyncStorage-ში.
