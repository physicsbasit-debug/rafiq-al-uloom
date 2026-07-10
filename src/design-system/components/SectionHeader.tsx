interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h3
        style={{
          margin: 0,
          color: '#1F2937',
          fontSize: '1.05rem',
        }}
      >
        {title}
      </h3>

      {description ? (
        <p
          style={{
            margin: '0.35rem 0 0',
            color: '#6B7280',
            lineHeight: 1.8,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
