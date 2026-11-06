export default function ChildAvatar({
  photo,
  firstName,
  lastName,
  size = 40,
}: {
  photo?: string | null;
  firstName: string;
  lastName: string;
  size?: number;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const style = { width: size, height: size };

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`${firstName} ${lastName}`}
        style={style}
        className="rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0"
      />
    );
  }

  return (
    <div
      style={style}
      className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold shrink-0"
    >
      <span style={{ fontSize: size * 0.4 }}>{initials}</span>
    </div>
  );
}
