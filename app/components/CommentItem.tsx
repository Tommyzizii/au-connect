// TODO:move-to-type
export type CommentType = {
  id: string;
  username: string;
  profilePic: string;
  content: string;
  createdAt: string;
  replies?: CommentType[];
};

export default function CommentItem({
  comment,
  depth = 0,
}: {
  comment: CommentType;
  depth?: number;
}) {
  return (
    <div
      className="flex gap-3"
      style={{ marginLeft: depth * 16 }} // indentation
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={comment.profilePic} className="w-8 h-8 rounded-full" alt="" />

      <div className="text-sm text-gray-900">
        <span className="font-semibold mr-1">{comment.username}</span>
        {comment.content}

        <div className="text-xs text-gray-500 mt-1">{comment.createdAt}</div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
