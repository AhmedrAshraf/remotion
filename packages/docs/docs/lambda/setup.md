---
id: setup
title: Setup
slug: /lambda/setup
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## 1. Install `@remotion/lambda`

<Tabs
defaultValue="npm"
values={[
{ label: 'npm', value: 'npm', },
{ label: 'yarn', value: 'yarn', },
{ label: 'pnpm', value: 'pnpm', },
]
}>
<TabItem value="npm">

```bash
npm i @remotion/lambda
```

  </TabItem>

  <TabItem value="yarn">

```bash
yarn add @remotion/lambda
```

  </TabItem>

  <TabItem value="pnpm">

```bash
pnpm i @remotion/lambda
```

  </TabItem>
</Tabs>

Also update **all the other Remotion packages** to have the same version: `remotion`, `@remotion/cli` and others.

:::note
Make sure no package version number has a `^` character in front of it as it can lead to a version conflict.
:::

Your package.json should look like the following:

```json
  "@remotion/cli": "3.0.0", // Replace 3.0.0 with the current version
  "@remotion/lambda": "3.0.0", // Remove any `^` character
  // ...
  "remotion": "3.0.0",
```

## 2. Create role policy

- Go to [AWS account IAM Policies section](https://console.aws.amazon.com/iamv2/home?#/policies)
- Click on "Create policy"
- Click on JSON
- In your project, type `npx remotion lambda policies role` in the command line and copy it into the "JSON" field on AWS.
- Click next. On the tags page, you don't need to fill in anything. Click next again.
- Give the policy **exactly** the name `remotion-lambda-policy`. The other fields can be left as they are.

## 3. Create a role

- Go to [AWS account IAM Roles section](https://console.aws.amazon.com/iamv2/home#/roles)
- Click "Create role".
- Under "Use cases", select "Lambda". Click next.
- Under "Attach permissions policies", filter for `remotion-lambda-policy` and click the checkbox to assign this policy. Click next.
- In the final step, name the role `remotion-lambda-role` **exactly**. You can leave the other fields as is.
- Click "Create role" to confirm.

## 4. Create a user

- Go to [AWS account IAM Users section](https://console.aws.amazon.com/iamv2/home#/users)
- Click `Add users`
- Enter any username, such as `remotion-user`.
- **Check** the "Access key - Programmatic access" option.
- **Don't check** the Management console access option. You don't need it.
- Click "Next: Permissions", then "Next: Tags", then "Next: Review" without changing any settings.
- Click "Create user", and ignore the warning that might appear.
- Reveal the Secret access key.
- Add a `.env` file to your project, and insert the following contents, using the credentials you just copied:

```txt title=".env"
REMOTION_AWS_ACCESS_KEY_ID=<Access key ID>
REMOTION_AWS_SECRET_ACCESS_KEY=<Secret access key>
```

## 5. Add permissions to your user

- Go to [AWS account IAM Users section](https://console.aws.amazon.com/iamv2/home#/users)
- Select the user you just created.
- Click "Add inline policy" on the right of the screen under "Permissions policies".
- Click the tab "JSON".
- Enter in your terminal: `npx remotion lambda policies user` and copy into the AWS text field what gets printed.
- Give the policy a name. For example `remotion-user-policy`, but it can be anything..
- Click "Create policy" to confirm.

## 6. Optional: Validate the permission setup

- Run `npx remotion lambda policies validate`

<hr/>

For the following steps, you may execute them on the CLI, or programmatically using the Node.JS APIs.

## 7. Deploy a function

<Tabs
defaultValue="cli"
values={[
{ label: 'CLI', value: 'cli', },
{ label: 'Node.JS', value: 'node', },
]
}>
<TabItem value="cli">

Deploy a function that can render videos into your AWS account by executing the following command:

```bash
npx remotion lambda functions deploy
```

</TabItem>
<TabItem value="node">

You can deploy a function that can render videos into your AWS account using [`deployFunction()`](/docs/lambda/deployfunction).

```ts twoslash
// @module: ESNext
// @target: ESNext
import { deployFunction } from "@remotion/lambda";

// ---cut---
const { functionName } = await deployFunction({
  region: "us-east-1",
  timeoutInSeconds: 120,
  memorySizeInMb: 1536,
  createCloudWatchLogGroup: true,
  architecture: "arm64",
});
```

The function name is returned which you'll need for rendering.
</TabItem>
</Tabs>

## 8. Deploy a website

<Tabs
defaultValue="cli"
values={[
{ label: 'CLI', value: 'cli', },
{ label: 'Node.JS', value: 'node', },
]
}>
<TabItem value="cli">

Run the following command to deploy your Remotion project to an S3 bucket. Pass as the last argument the entry file of the project - this is the file where [`registerRoot()`](/docs/register-root) is called.

```bash
npx remotion lambda sites create src/index.tsx
```

A URL will be printed pointing to the deployed project.

</TabItem>
<TabItem value="node">

First, you need to create an S3 bucket in your preferred region. If one already exists, it will be used instead:

```ts twoslash
// @module: ESNext
// @target: ESNext
import path from "path";
import { deploySite, getOrCreateBucket } from "@remotion/lambda";

const { bucketName } = await getOrCreateBucket({
  region: "us-east-1",
});
```

Next, upload your Remotion project to an S3 bucket. Specify the entry point of your Remotion project, this is the file where [`registerRoot()`](/docs/register-root) is called.

```ts twoslash
// @module: ESNext
// @target: ESNext
import path from "path";
import { deploySite, getOrCreateBucket } from "@remotion/lambda";

const { bucketName } = await getOrCreateBucket({
  region: "us-east-1",
});
// ---cut---
const { serveUrl } = await deploySite({
  bucketName,
  entryPoint: path.resolve(process.cwd(), "src/index.tsx"),
  region: "us-east-1",
});
```

You are now ready to render a video.

</TabItem>
</Tabs>

## 9. Check AWS concurrency limit

Check the concurrency limit that AWS has given to your account:

```
npx remotion lambda quotas
```

By default, it is `1000` concurrent invocations per region. However, new accounts might have a limit [as low as `10`](/docs/lambda/troubleshooting/rate-limit). Each Remotion render may use as much as 200 functions per render concurrently, so if your assigned limit is very low, [you might want to request an increase right away](/docs/lambda/troubleshooting/rate-limit).

## 10. Render a video

<Tabs
defaultValue="cli"
values={[
{ label: 'CLI', value: 'cli', },
{ label: 'Node.JS', value: 'node', },
]
}>
<TabItem value="cli">

Take the URL you received from the step 8 - your "serve URL" - and run the following command. Also pass in the [ID of the composition](/docs/composition) you'd like to render.

```bash
npx remotion lambda render <serve-url> <composition-id>
```

Progress will be printed until the video finished rendering. Congrats! You rendered your first video using Remotion Lambda 🚀

</TabItem>
<TabItem value="node">

You already have the function name from a previous step. But since you only need to deploy a function once, it's useful to retrieve the name of your deployed function programmatically before rendering a video in case your Node.JS program restarts. We can call [`getFunctions()`](/docs/lambda/getfunctions) with the `compatibleOnly` flag to get only functions with a matching version.

```ts twoslash
// @module: ESNext
// @target: ESNext
import {
  getFunctions,
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";

const functions = await getFunctions({
  region: "us-east-1",
  compatibleOnly: true,
});

const functionName = functions[0].functionName;
```

We can now trigger a render using the [`renderMediaOnLambda()`](/docs/lambda/rendermediaonlambda) function.

```ts twoslash
// @module: ESNext
// @target: ESNext
import {
  getFunctions,
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";

const url = "string";
const functions = await getFunctions({
  region: "us-east-1",
  compatibleOnly: true,
});

const functionName = functions[0].functionName;
// ---cut---

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName,
  serveUrl: url,
  composition: "HelloWorld",
  inputProps: {},
  codec: "h264",
  imageFormat: "jpeg",
  maxRetries: 1,
  framesPerLambda: 20,
  privacy: "public",
});
```

The render will now run and after a while the video will be available in your S3 bucket. You can at any time get the status of the video render by calling [`getRenderProgress()`](/docs/lambda/getrenderprogress).

```ts twoslash
// @module: ESNext
// @target: ESNext
import {
  getFunctions,
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda";

const url = "string";
const functions = await getFunctions({
  region: "us-east-1",
  compatibleOnly: true,
});

const functionName = functions[0].functionName;

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName,
  serveUrl: url,
  composition: "HelloWorld",
  inputProps: {},
  codec: "h264",
  imageFormat: "jpeg",
  maxRetries: 1,
  framesPerLambda: 20,
  privacy: "public",
});
// ---cut---
while (true) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    functionName,
    region: "us-east-1",
  });
  if (progress.done) {
    console.log("Render finished!", progress.outputFile);
    process.exit(0);
  }
  if (progress.fatalErrorEncountered) {
    console.error("Error enountered", progress.errors);
    process.exit(1);
  }
}
```

This code will poll every second to check the progress of the video and exit the script if the render is done. Congrats! [Check your S3 Bucket](https://s3.console.aws.amazon.com/s3/) - you just rendered your first video using Remotion Lambda 🚀

</TabItem>
</Tabs>

## Next steps

- Select [which region(s)](/docs/lambda/region-selection) you want to run Remotion Lambda in.
- Familiarize yourself with the CLI and the Node.JS APIs (list in sidebar).
- Learn how to [upgrade Remotion Lambda](/docs/lambda/upgrading).
- Before going live, go through the [Production checklist](/docs/lambda/checklist).
- If you have any questions, go through the [FAQ](/docs/lambda/faq) or ask in our [Discord channel](https://remotion.dev/discord)
