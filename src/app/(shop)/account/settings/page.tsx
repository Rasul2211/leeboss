import { requireUser } from '@/lib/auth';
import { PasswordForm, ProfileForm } from '@/components/account/SettingsForms';
import { logout } from '@/app/actions/auth';

export default async function SettingsPage() {
  const user = await requireUser('/account/settings');

  return (
    <div className="max-w-lg space-y-10">
      <section>
        <h2 className="text-base font-semibold text-ink">Личные данные</h2>
        <div className="mt-4">
          <ProfileForm defaults={{ name: user.name, phone: user.phone }} />
        </div>
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-base font-semibold text-ink">Смена пароля</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>

      <section className="border-t border-line pt-8 lg:hidden">
        {/* the sidebar carries this on wide screens, but it is hidden on phones */}
        <form action={logout}>
          <button type="submit" className="text-sm text-brand hover:text-brand-hover">
            Выйти из аккаунта
          </button>
        </form>
      </section>
    </div>
  );
}
