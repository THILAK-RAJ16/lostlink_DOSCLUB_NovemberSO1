/**
 * LostLink - Client-side Google Sign-In helper
 * Supports popup OAuth flow and postMessage listener for cross-origin sandbox safety
 */

(function () {
    window.LostLinkGoogleAuth = {
        initPopupFlow: function (authUrl) {
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                authUrl,
                'GoogleAuthPopup',
                `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
            );

            window.addEventListener('message', function onMessage(event) {
                if (event.data && event.data.type === 'OAUTH_RESPONSE') {
                    window.removeEventListener('message', onMessage);
                    if (event.data.success) {
                        window.location.href = '/dashboard';
                    } else {
                        alert('Google Sign-In failed: ' + (event.data.error || 'Unknown error'));
                    }
                }
            });
        }
    };
})();
