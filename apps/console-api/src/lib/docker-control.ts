import Docker from 'dockerode';

const enableDockerControl = process.env.ENABLE_DOCKER_CONTROL !== 'false';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function restartContainer(containerName: string): Promise<void> {
  if (!enableDockerControl) {
    return;
  }
  const container = docker.getContainer(containerName);
  await container.restart();
}

export async function isContainerRunning(containerName: string): Promise<boolean> {
  if (!enableDockerControl) {
    return false;
  }
  try {
    const info = await docker.getContainer(containerName).inspect();
    return Boolean(info.State?.Running);
  } catch {
    return false;
  }
}
