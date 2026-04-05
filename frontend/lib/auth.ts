import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { supabase } from '@/lib/supabase';
import { encryptToken } from '@vibeboard/shared';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      const githubProfile = profile as {
        id: number;
        login: string;
        avatar_url?: string;
      };

      // Encrypt the GitHub token before storing in Supabase
      const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
      const rawToken = account.access_token;
      const encryptedToken =
        rawToken && encryptionKey ? encryptToken(rawToken, encryptionKey) : null;

      const { error } = await supabase.from('users').upsert(
        {
          github_id: githubProfile.id,
          username: githubProfile.login,
          email: user.email ?? null,
          name: user.name ?? null,
          avatar_url: githubProfile.avatar_url ?? user.image ?? null,
          access_token: encryptedToken,
        },
        { onConflict: 'github_id' }
      );

      if (error) {
        console.error('[auth] Failed to upsert user:', error.message);
        return false;
      }

      return true;
    },

    async jwt({ token, account }) {
      // Store githubId in the JWT (server-side only, never sent to client)
      if (account) {
        token.githubId = account.providerAccountId;
      }
      return token;
    },

    async session({ session, token }) {
      // Only expose the user's GitHub ID — never the access token
      return {
        ...session,
        user: {
          ...session.user,
          id: token.githubId as string,
        },
      };
    },
  },
  pages: {
    signIn: '/auth/login',
  },
};
