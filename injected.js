(function () {
    console.log('[LeetCode Tracker] Injected script loaded');

    // Override fetch to intercept LeetCode API calls
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const [url, options] = args;
        const urlString = typeof url === 'string' ? url : url.toString();

        // Call original fetch first
        const response = await originalFetch.apply(this, args);

        try {
            // Check if this is a run code request
            if (urlString.includes('/interpret_solution/') && options?.method === 'POST') {
                const clonedResponse = response.clone();

                // We need to parse the JSON to get the ID
                clonedResponse.json().then(data => {
                    if (data.interpret_id) {
                        window.dispatchEvent(new CustomEvent('LeetCodeTracker_Intercept', {
                            detail: {
                                type: 'run',
                                id: data.interpret_id,
                                testCase: data.test_case || null
                            }
                        }));
                    }
                }).catch(err => console.error('[LeetCode Tracker] Error parsing run response:', err));
            }

            // Check if this is a submit request
            if (urlString.includes('/submit/') && options?.method === 'POST') {
                const clonedResponse = response.clone();

                clonedResponse.json().then(data => {
                    if (data.submission_id) {
                        window.dispatchEvent(new CustomEvent('LeetCodeTracker_Intercept', {
                            detail: {
                                type: 'submit',
                                id: data.submission_id
                            }
                        }));
                    }
                }).catch(err => console.error('[LeetCode Tracker] Error parsing submit response:', err));
            }

        } catch (error) {
            console.error('[LeetCode Tracker] Error determining request type:', error);
        }

        return response;
    };

    // Also intercept XMLHttpRequest for older LeetCode versions or other calls
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._lcTrackerUrl = url;
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;
        const url = this._lcTrackerUrl;

        if (url && (url.includes('/interpret_solution/') || url.includes('/submit/'))) {
            this.addEventListener('load', function () {
                try {
                    const data = JSON.parse(xhr.responseText);
                    const type = url.includes('/interpret_solution/') ? 'run' : 'submit';
                    const submissionId = data.interpret_id || data.submission_id;

                    if (submissionId) {
                        window.dispatchEvent(new CustomEvent('LeetCodeTracker_Intercept', {
                            detail: {
                                type: type,
                                id: submissionId,
                                testCase: data.test_case || null
                            }
                        }));
                    }
                } catch (error) {
                    console.error('[LeetCode Tracker] Error processing XHR:', error);
                }
            });
        }

        return originalXHRSend.apply(this, [body]);
    };

})();
