import {Internals} from 'remotion';
import type {Page} from './browser/BrowserPage';
import {normalizeServeUrl} from './normalize-serve-url';
import {puppeteerEvaluateWithCatch} from './puppeteer-evaluate';
import {validatePuppeteerTimeout} from './validate-puppeteer-timeout';

export const setPropsAndEnv = async ({
	inputProps,
	envVariables,
	page,
	serveUrl,
	initialFrame,
	timeoutInMilliseconds,
	proxyPort,
	retriesRemaining,
}: {
	inputProps: unknown;
	envVariables: Record<string, string> | undefined;
	page: Page;
	serveUrl: string;
	initialFrame: number;
	timeoutInMilliseconds: number | undefined;
	proxyPort: number;
	retriesRemaining: number;
}): Promise<void> => {
	validatePuppeteerTimeout(timeoutInMilliseconds);
	const actualTimeout =
		timeoutInMilliseconds ?? Internals.DEFAULT_PUPPETEER_TIMEOUT;
	page.setDefaultTimeout(actualTimeout);
	page.setDefaultNavigationTimeout(actualTimeout);

	const urlToVisit = normalizeServeUrl(serveUrl);

	await page.evaluateOnNewDocument(
		(timeout: number) => {
			window.remotion_puppeteerTimeout = timeout;
		},
		[actualTimeout]
	);

	if (inputProps) {
		await page.evaluateOnNewDocument(
			(input: string) => {
				window.remotion_inputProps = input;
			},
			[JSON.stringify(inputProps)]
		);
	}

	if (envVariables) {
		await page.evaluateOnNewDocument(
			(input: string) => {
				window.remotion_envVariables = input;
			},
			[JSON.stringify(envVariables)]
		);
	}

	await page.evaluateOnNewDocument(
		(key: number) => {
			window.remotion_initialFrame = key;
		},
		[initialFrame]
	);

	await page.evaluateOnNewDocument(
		(port: number) => {
			window.remotion_proxyPort = port;
		},
		[proxyPort]
	);

	const pageRes = await page.goto(urlToVisit);

	if (pageRes === null) {
		throw new Error(`Visited "${urlToVisit}" but got no response.`);
	}

	const status = pageRes.status();

	// S3 in rare occasions returns a 500 or 503 error code for GET operations.
	// Usually it is fixed by retrying.
	if (status >= 500 && status <= 504 && retriesRemaining > 0) {
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 2000);
		});

		return setPropsAndEnv({
			envVariables,
			initialFrame,
			inputProps,
			page,
			proxyPort,
			retriesRemaining: retriesRemaining - 1,
			serveUrl,
			timeoutInMilliseconds,
		});
	}

	if (
		status !== 200 &&
		status !== 301 &&
		status !== 302 &&
		status !== 303 &&
		status !== 304 &&
		status !== 307 &&
		status !== 308
	) {
		throw new Error(
			`Error while getting compositions: Tried to go to ${urlToVisit} but the status code was ${status} instead of 200. Does the site you specified exist?`
		);
	}

	const isRemotionFn = await puppeteerEvaluateWithCatch<
		typeof window['getStaticCompositions']
	>({
		pageFunction: () => {
			return window.getStaticCompositions;
		},
		args: [],
		frame: null,
		page,
	});
	if (isRemotionFn === undefined) {
		throw new Error(
			`Error while getting compositions: Tried to go to ${urlToVisit} and verify that it is a Remotion project by checking if window.getStaticCompositions is defined. However, the function was undefined, which indicates that this is not a valid Remotion project. Please check the URL you passed.`
		);
	}

	const siteVersion = await puppeteerEvaluateWithCatch<'3'>({
		pageFunction: () => {
			return window.siteVersion;
		},
		args: [],
		frame: null,
		page,
	});

	if (siteVersion !== '3') {
		throw new Error(
			`Incompatible site: When visiting ${urlToVisit}, a bundle was found, but one that is not compatible with this version of Remotion. The bundle format changed in version 3.0.11. To resolve this error, please bundle and deploy again.`
		);
	}
};
