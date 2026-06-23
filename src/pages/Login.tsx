import { Suspense, lazy } from 'react';
import { shouldUseLiteLogin } from '@/lib/utils/deviceCompat';
import { LoginLite } from './LoginLite';

const LoginAnimated = lazy(() =>
  import('./LoginAnimated').then((m) => ({ default: m.LoginAnimated }))
);

export const Login = () => {
  if (shouldUseLiteLogin()) {
    return <LoginLite />;
  }

  return (
    <Suspense fallback={<LoginLite />}>
      <LoginAnimated />
    </Suspense>
  );
};
