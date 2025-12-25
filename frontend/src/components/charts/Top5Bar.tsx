import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

interface Props {
  data: { name: string; value: number }[];
  xKey: string;
  yKey: string;
  label: string;
}

// Biểu đồ cột Top 5
export default function Top5Bar({ data, xKey, yKey, label }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={yKey} fill="#10b981" name={label} />
      </BarChart>
    </ResponsiveContainer>
  );
}
