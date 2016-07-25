import Ember from 'ember';
import DS from 'ember-data';

function logErrorStack(e) {
    let text = e.toString();
    let stack = e.stack;
    if (stack) {
        if (!stack.startsWith(text)) {
            stack = `${text}\n${stack}`;
        }
        text = stack;
    }
    Ember.Logger.warn(text);
}

export function initialize(applicationInstance) {
    const notificationManager = applicationInstance.lookup('service:notification-manager');

    function notifyError(err) {
        // some errors may end up in the handler more than once, e.g. when promises are chained
        if (err._portiaHandledError) {
            return;
        }

        let logged = false;
        if (window.NREUM) {
            window.NREUM.noticeError(err);
            logged = true;
        }
        if (window.Raven) {
            window.Raven.captureException(err);
            logged = true;
        }

        const instructions = logged ?
            "Our developers have already been notified." :
            "Please notify the developers. Details have been logged to the console.";

        if (err instanceof DS.AdapterError) {
            for (let error of err.errors) {
                Ember.Logger.warn(`AdapterError: ${error.title}\n${error.detail}`);
                notificationManager.add({
                    title: error.title || 'Server error',
                    message: 'An error occurred while communicating with the server. ' +
                        instructions,
                    type: +error.status >= 500 ? 'danger' : 'warning'
                });
            }
        } else {
            logErrorStack(err);
            notificationManager.add({
                title: err.title || 'Unexpected error',
                message: 'An unexpected error has occurred. ' + instructions,
                type: 'danger'
            });
        }

        err._portiaHandledError = true;
    }

    Ember.onerror = notifyError;
}

export default {
    name: 'error-handler',
    initialize: initialize
};
