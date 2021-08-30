firebase.initializeApp({
    messagingSenderId: '<messagingSenderId>'
});

var but_generated = $('#generated');
var token = $('#token');
var message = $('#notification');
var fcm_id = $('#fcm_id');

var info = $('#info');
var info_message = $('#info-message');

var alert = $('#alert');
var alert_message = $('#alert-message');

if (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'localStorage' in window &&
    'fetch' in window &&
    'postMessage' in window
) {
    var messaging = firebase.messaging();

    but_generated.on('click', function() {
        messaging.requestPermission()
        .then(function() {
            messaging.getToken()
                .then(function(actual_token) {
                    if (actual_token) {
                        updateUIForPushEnabled(actual_token);
                    } else {
                        showError('Ошибка при генерации токена. Токен не сгенерирован. Повторите попытку');
                    }
                })
                .catch(function(error) {
                    showError('Ошибка при генерации токена', error);
                });
        })
        .catch(function(error) {
            showError(error);
        });
    });

    message.on('submit', function(event) {
        event.preventDefault();

        var notification = {};
        message.find('input').each(function () {
            var input = $(this);
            notification[input.attr('name')] = input.val();
        });

        sendNotification(notification);
    });

    messaging.onMessage(function(payload) {
        console.log('Принятое сообщение', payload);

        navigator.serviceWorker.register('/firebase-js-client/firebase-messaging-sw.js');
        Notification.requestPermission(function(permission) {
            if (permission === 'granted') {
                navigator.serviceWorker.ready.then(function(registration) {
                  payload.data.data = JSON.parse(JSON.stringify(payload.data));

                  registration.showNotification(payload.data.title, payload.data);
                }).catch(function(error) {
                    showError('Ошибка регистрации Service Worker', error);
                });
            }
        });
    });

    messaging.onTokenRefresh(function() {
        messaging.getToken()
            .then(function(refreshedToken) {
                console.log('Токен обновлен');
                sendTokenToServer(refreshedToken);
                updateUIForPushEnabled(refreshedToken);
            })
            .catch(function(error) {
                showError('Ошибка при обновлении токена', error);
            });
    });

} else {
    if (!('Notification' in window)) {
        showError('Уведомления не поддерживаются');
    } else if (!('serviceWorker' in navigator)) {
        showError('ServiceWorker не поддерживается');
    } else if (!('fetch' in window)) {
        showError('fetch не поддерживается');
    } else if (!('postMessage' in window)) {
        showError('postMessage не поддерживается');
    }

    updateUIForPushPermissionRequired();
}

function sendNotification(notification) {
    var key = '<key>';
    console.log('Отправляемое сообщение', notification);

    info.hide();
    alert.hide();

    fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Authorization': 'key=' + key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: notification,
                    to: token.val()
                })
            }).then(function(response) {
                return response.json();
            }).then(function(json) {
                console.log('Ответ FCM об отправке', json);

                if (json.success === 1) {
                    fcm_id.text(json.results[0].message_id);
                } else {
                     showError(json.results[0].error, undefined);
                }
            }).catch(function(error) {
                showError(error);
            })
        .catch(function(error) {
            showError(error);
        });
}

function updateUIForPushEnabled(actual_token) {
    console.log(actual_token);
    token.val(actual_token);
}

function showError(error, error_data) {
    alert.show();

    if (typeof error_data !== "undefined") {
        alert_message.html(error + '<br><pre>' + JSON.stringify(error_data) + '</pre>');
        console.error(error, error_data);
    } else {
        alert_message.html(error);
        console.error(error);
    }
}
